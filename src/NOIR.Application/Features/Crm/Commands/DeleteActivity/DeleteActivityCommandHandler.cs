namespace NOIR.Application.Features.Crm.Commands.DeleteActivity;

public class DeleteActivityCommandHandler
{
    private readonly IRepository<CrmActivity, Guid> _activityRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteActivityCommandHandler(
        IRepository<CrmActivity, Guid> activityRepository,
        IUnitOfWork unitOfWork)
    {
        _activityRepository = activityRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Features.Crm.DTOs.ActivityDto>> Handle(
        DeleteActivityCommand command,
        CancellationToken cancellationToken)
    {
        var spec = new Specifications.ActivityByIdSpec(command.Id);
        var activity = await _activityRepository.FirstOrDefaultAsync(spec, cancellationToken);

        if (activity is null)
        {
            return Result.Failure<Features.Crm.DTOs.ActivityDto>(
                Error.NotFound($"Activity with ID '{command.Id}' not found.", "NOIR-CRM-040"));
        }

        var dto = MapToDto(activity);
        _activityRepository.Remove(activity);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(dto);
    }

    private static Features.Crm.DTOs.ActivityDto MapToDto(CrmActivity a) =>
        new(a.Id, a.Type, a.Subject, a.Description,
            a.ContactId, a.Contact?.FullName,
            a.LeadId, a.Lead?.Title,
            a.PerformedById,
            a.PerformedBy != null ? $"{a.PerformedBy.FirstName} {a.PerformedBy.LastName}" : "",
            a.PerformedAt, a.DurationMinutes,
            a.CreatedAt, a.ModifiedAt);
}
