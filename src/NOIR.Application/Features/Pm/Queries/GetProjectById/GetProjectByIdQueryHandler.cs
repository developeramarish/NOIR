namespace NOIR.Application.Features.Pm.Queries.GetProjectById;

public class GetProjectByIdQueryHandler
{
    private readonly IRepository<Project, Guid> _projectRepository;

    public GetProjectByIdQueryHandler(IRepository<Project, Guid> projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result<Features.Pm.DTOs.ProjectDto>> Handle(
        GetProjectByIdQuery query,
        CancellationToken cancellationToken)
    {
        var spec = new Specifications.ProjectByIdSpec(query.Id);
        var project = await _projectRepository.FirstOrDefaultAsync(spec, cancellationToken);
        if (project is null)
        {
            return Result.Failure<Features.Pm.DTOs.ProjectDto>(
                Error.NotFound($"Project with ID '{query.Id}' not found.", "NOIR-PM-002"));
        }

        return Result.Success(MapToDto(project));
    }

    private static Features.Pm.DTOs.ProjectDto MapToDto(Project p) =>
        new(p.Id, p.Name, p.Slug, p.Description, p.Status,
            p.StartDate, p.EndDate, p.DueDate,
            p.OwnerId, p.Owner != null ? $"{p.Owner.FirstName} {p.Owner.LastName}" : null,
            p.Budget, p.Currency, p.Color, p.Icon, p.Visibility,
            p.Members.Select(m => new Features.Pm.DTOs.ProjectMemberDto(
                m.Id, m.EmployeeId,
                m.Employee != null ? $"{m.Employee.FirstName} {m.Employee.LastName}" : string.Empty,
                m.Employee?.AvatarUrl,
                m.Role, m.JoinedAt)).ToList(),
            p.Columns.OrderBy(c => c.SortOrder).Select(c => new Features.Pm.DTOs.ProjectColumnDto(
                c.Id, c.Name, c.SortOrder, c.Color, c.WipLimit)).ToList(),
            p.CreatedAt, p.ModifiedAt);
}
