namespace NOIR.Application.Features.Hr.Queries.GetEmployeeById;

public class GetEmployeeByIdQueryHandler
{
    private readonly IRepository<Employee, Guid> _employeeRepository;

    public GetEmployeeByIdQueryHandler(IRepository<Employee, Guid> employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<Result<Features.Hr.DTOs.EmployeeDto>> Handle(
        GetEmployeeByIdQuery query,
        CancellationToken cancellationToken)
    {
        var spec = new Specifications.EmployeeByIdReadOnlySpec(query.Id);
        var employee = await _employeeRepository.FirstOrDefaultAsync(spec, cancellationToken);

        if (employee is null)
        {
            return Result.Failure<Features.Hr.DTOs.EmployeeDto>(
                Error.NotFound($"Employee with ID '{query.Id}' not found.", "NOIR-HR-010"));
        }

        var directReports = employee.DirectReports
            .Select(dr => new Features.Hr.DTOs.DirectReportDto(
                dr.Id, dr.EmployeeCode, $"{dr.FirstName} {dr.LastName}",
                dr.AvatarUrl, dr.Position, dr.Status))
            .ToList();

        return Result.Success(new Features.Hr.DTOs.EmployeeDto(
            employee.Id, employee.EmployeeCode, employee.FirstName, employee.LastName,
            employee.Email, employee.Phone, employee.AvatarUrl,
            employee.DepartmentId, employee.Department?.Name ?? "", employee.Position,
            employee.ManagerId,
            employee.Manager != null ? $"{employee.Manager.FirstName} {employee.Manager.LastName}" : null,
            employee.UserId, employee.UserId != null,
            employee.JoinDate, employee.EndDate, employee.Status, employee.EmploymentType,
            employee.Notes, directReports, employee.CreatedAt, employee.ModifiedAt));
    }
}
