using NOIR.Application.Common.Models;

namespace NOIR.Application.Features.Hr.Queries.GetEmployees;

public class GetEmployeesQueryHandler
{
    private readonly IRepository<Employee, Guid> _employeeRepository;

    public GetEmployeesQueryHandler(IRepository<Employee, Guid> employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<PagedResult<Features.Hr.DTOs.EmployeeListDto>>> Handle(
        GetEmployeesQuery query,
        CancellationToken cancellationToken)
    {
        var skip = (query.Page - 1) * query.PageSize;

        var spec = new Specifications.EmployeesFilterSpec(
            query.Search, query.DepartmentId, query.Status, query.EmploymentType,
            skip, query.PageSize, query.OrderBy, query.IsDescending);

        var employees = await _employeeRepository.ListAsync(spec, cancellationToken);

        var countSpec = new Specifications.EmployeesCountSpec(
            query.Search, query.DepartmentId, query.Status, query.EmploymentType);
        var totalCount = await _employeeRepository.CountAsync(countSpec, cancellationToken);

        var items = employees.Select(e => new Features.Hr.DTOs.EmployeeListDto(
            e.Id, e.EmployeeCode, e.FirstName, e.LastName, e.Email, e.AvatarUrl,
            e.Department?.Name ?? "", e.Position,
            e.Manager != null ? $"{e.Manager.FirstName} {e.Manager.LastName}" : null,
            e.Status, e.EmploymentType)).ToList();

        return Result.Success(PagedResult<Features.Hr.DTOs.EmployeeListDto>.Create(
            items, totalCount, query.Page - 1, query.PageSize));
    }
}
