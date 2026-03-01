namespace NOIR.Application.Features.Hr.Queries.GetOrgChart;

public class GetOrgChartQueryHandler
{
    private readonly IRepository<Department, Guid> _departmentRepository;
    private readonly IRepository<Employee, Guid> _employeeRepository;

    public GetOrgChartQueryHandler(
        IRepository<Department, Guid> departmentRepository,
        IRepository<Employee, Guid> employeeRepository)
    {
        _departmentRepository = departmentRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<List<Features.Hr.DTOs.OrgChartNodeDto>>> Handle(
        GetOrgChartQuery query,
        CancellationToken cancellationToken)
    {
        var deptSpec = new Specifications.AllDepartmentsSpec();
        var allDepartments = (await _departmentRepository.ListAsync(deptSpec, cancellationToken))
            .Where(d => d.IsActive)
            .ToList();

        IEnumerable<Department> targetDepartments;
        if (query.DepartmentId.HasValue)
        {
            targetDepartments = allDepartments.Where(d => d.Id == query.DepartmentId.Value);
        }
        else
        {
            targetDepartments = allDepartments.Where(d => d.ParentDepartmentId == null);
        }

        var departmentLookup = allDepartments.ToLookup(d => d.ParentDepartmentId);
        var nodes = new List<Features.Hr.DTOs.OrgChartNodeDto>();

        foreach (var dept in targetDepartments)
        {
            var node = await BuildOrgChartNodeAsync(dept, departmentLookup, cancellationToken);
            nodes.Add(node);
        }

        return Result.Success(nodes);
    }

    private async Task<Features.Hr.DTOs.OrgChartNodeDto> BuildOrgChartNodeAsync(
        Department department,
        ILookup<Guid?, Department> departmentLookup,
        CancellationToken cancellationToken)
    {
        var employeeSpec = new Specifications.EmployeesByDepartmentSpec(department.Id);
        var employeeCount = await _employeeRepository.CountAsync(employeeSpec, cancellationToken);

        var children = new List<Features.Hr.DTOs.OrgChartNodeDto>();

        foreach (var subDept in departmentLookup[department.Id])
        {
            var childNode = await BuildOrgChartNodeAsync(subDept, departmentLookup, cancellationToken);
            children.Add(childNode);
        }

        return new Features.Hr.DTOs.OrgChartNodeDto(
            department.Id,
            Features.Hr.DTOs.OrgChartNodeType.Department,
            department.Name,
            department.Manager != null ? $"Manager: {department.Manager.FirstName} {department.Manager.LastName}" : null,
            null,
            employeeCount,
            null,
            children);
    }
}
