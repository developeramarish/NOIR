using NOIR.Application.Features.Hr.Commands.CreateEmployee;
using NOIR.Application.Features.Hr.Commands.UpdateEmployee;
using NOIR.Application.Features.Hr.Commands.DeactivateEmployee;
using NOIR.Application.Features.Hr.Commands.ReactivateEmployee;
using NOIR.Application.Features.Hr.Commands.LinkEmployeeToUser;
using NOIR.Application.Features.Hr.Queries.GetEmployees;
using NOIR.Application.Features.Hr.Queries.GetEmployeeById;
using NOIR.Application.Features.Hr.Queries.SearchEmployees;
using NOIR.Application.Features.Hr.Queries.GetOrgChart;
using NOIR.Application.Features.Hr.DTOs;

namespace NOIR.Web.Endpoints;

/// <summary>
/// Employee API endpoints.
/// Provides CRUD operations for HR employees.
/// </summary>
public static class EmployeeEndpoints
{
    public static void MapEmployeeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hr/employees")
            .WithTags("HR - Employees")
            .RequireFeature(ModuleNames.Erp.Hr)
            .RequireAuthorization();

        // Get all employees (paginated)
        group.MapGet("/", async (
            [FromQuery] string? search,
            [FromQuery] Guid? departmentId,
            [FromQuery] EmployeeStatus? status,
            [FromQuery] EmploymentType? employmentType,
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            IMessageBus bus) =>
        {
            var query = new GetEmployeesQuery(
                search, departmentId, status, employmentType,
                page ?? 1, pageSize ?? 20);
            var result = await bus.InvokeAsync<Result<PagedResult<EmployeeListDto>>>(query);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesRead)
        .WithName("GetEmployees")
        .WithSummary("Get paginated list of employees")
        .WithDescription("Returns employees with optional filtering by search, department, status, and employment type.")
        .Produces<PagedResult<EmployeeListDto>>(StatusCodes.Status200OK);

        // Search employees (autocomplete)
        group.MapGet("/search", async (
            [FromQuery] string? q,
            [FromQuery] int? take,
            IMessageBus bus) =>
        {
            var query = new SearchEmployeesQuery(q ?? "", take ?? 10);
            var result = await bus.InvokeAsync<Result<List<EmployeeSearchDto>>>(query);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesRead)
        .WithName("SearchEmployees")
        .WithSummary("Search employees for autocomplete")
        .WithDescription("Returns lightweight employee records matching the search text. Used for manager selection dropdowns.")
        .Produces<List<EmployeeSearchDto>>(StatusCodes.Status200OK);

        // Get org chart
        group.MapGet("/org-chart", async (
            [FromQuery] Guid? departmentId,
            IMessageBus bus) =>
        {
            var query = new GetOrgChartQuery(departmentId);
            var result = await bus.InvokeAsync<Result<List<OrgChartNodeDto>>>(query);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesRead)
        .WithName("GetOrgChart")
        .WithSummary("Get organizational chart")
        .WithDescription("Returns hierarchical org chart nodes. Optionally scoped to a specific department.")
        .Produces<List<OrgChartNodeDto>>(StatusCodes.Status200OK);

        // Get employee by ID
        group.MapGet("/{id:guid}", async (Guid id, IMessageBus bus) =>
        {
            var query = new GetEmployeeByIdQuery(id);
            var result = await bus.InvokeAsync<Result<EmployeeDto>>(query);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesRead)
        .WithName("GetEmployeeById")
        .WithSummary("Get employee by ID")
        .WithDescription("Returns full employee details including direct reports.")
        .Produces<EmployeeDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);

        // Create employee
        group.MapPost("/", async (
            CreateEmployeeRequest request,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new CreateEmployeeCommand(
                request.FirstName,
                request.LastName,
                request.Email,
                request.DepartmentId,
                request.JoinDate,
                request.EmploymentType,
                request.Phone,
                request.AvatarUrl,
                request.Position,
                request.ManagerId,
                request.UserId,
                request.Notes)
            {
                AuditUserId = currentUser.UserId
            };
            var result = await bus.InvokeAsync<Result<EmployeeDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesCreate)
        .WithName("CreateEmployee")
        .WithSummary("Create a new employee")
        .WithDescription("Creates a new employee record with auto-generated employee code.")
        .Produces<EmployeeDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
        .Produces<ProblemDetails>(StatusCodes.Status409Conflict);

        // Update employee
        group.MapPut("/{id:guid}", async (
            Guid id,
            UpdateEmployeeRequest request,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new UpdateEmployeeCommand(
                id,
                request.FirstName,
                request.LastName,
                request.Email,
                request.DepartmentId,
                request.EmploymentType,
                request.Phone,
                request.AvatarUrl,
                request.Position,
                request.ManagerId,
                request.Notes)
            {
                UserId = currentUser.UserId
            };
            var result = await bus.InvokeAsync<Result<EmployeeDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesUpdate)
        .WithName("UpdateEmployee")
        .WithSummary("Update an existing employee")
        .WithDescription("Updates employee details including department and manager assignments.")
        .Produces<EmployeeDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);

        // Deactivate employee
        group.MapPost("/{id:guid}/deactivate", async (
            Guid id,
            DeactivateEmployeeRequest request,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new DeactivateEmployeeCommand(id, request.Status)
            {
                UserId = currentUser.UserId
            };
            var result = await bus.InvokeAsync<Result<EmployeeDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesUpdate)
        .WithName("DeactivateEmployee")
        .WithSummary("Deactivate an employee")
        .WithDescription("Marks employee as Resigned or Terminated. Cascades: nulls direct reports' ManagerId and department ManagerId.")
        .Produces<EmployeeDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);

        // Reactivate employee
        group.MapPost("/{id:guid}/reactivate", async (
            Guid id,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new ReactivateEmployeeCommand(id)
            {
                UserId = currentUser.UserId
            };
            var result = await bus.InvokeAsync<Result<EmployeeDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesUpdate)
        .WithName("ReactivateEmployee")
        .WithSummary("Reactivate a deactivated employee")
        .WithDescription("Returns employee to Active status and clears end date.")
        .Produces<EmployeeDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);

        // Link employee to user
        group.MapPost("/{id:guid}/link-user", async (
            Guid id,
            LinkEmployeeToUserRequest request,
            [FromServices] ICurrentUser currentUser,
            IMessageBus bus) =>
        {
            var command = new LinkEmployeeToUserCommand(id, request.TargetUserId)
            {
                UserId = currentUser.UserId
            };
            var result = await bus.InvokeAsync<Result<EmployeeDto>>(command);
            return result.ToHttpResult();
        })
        .RequireAuthorization(Permissions.HrEmployeesUpdate)
        .WithName("LinkEmployeeToUser")
        .WithSummary("Link employee to a user account")
        .WithDescription("Associates an employee record with an application user account for portal access.")
        .Produces<EmployeeDto>(StatusCodes.Status200OK)
        .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
        .Produces<ProblemDetails>(StatusCodes.Status404NotFound);
    }
}

/// <summary>
/// Request to deactivate an employee.
/// </summary>
public sealed record DeactivateEmployeeRequest(EmployeeStatus Status);

/// <summary>
/// Request to link an employee to a user account.
/// </summary>
public sealed record LinkEmployeeToUserRequest(string TargetUserId);
