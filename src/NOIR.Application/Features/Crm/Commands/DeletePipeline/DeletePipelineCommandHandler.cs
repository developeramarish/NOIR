namespace NOIR.Application.Features.Crm.Commands.DeletePipeline;

public class DeletePipelineCommandHandler
{
    private readonly IRepository<Pipeline, Guid> _pipelineRepository;
    private readonly IRepository<Lead, Guid> _leadRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeletePipelineCommandHandler(
        IRepository<Pipeline, Guid> pipelineRepository,
        IRepository<Lead, Guid> leadRepository,
        IUnitOfWork unitOfWork)
    {
        _pipelineRepository = pipelineRepository;
        _leadRepository = leadRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Features.Crm.DTOs.PipelineDto>> Handle(
        DeletePipelineCommand command,
        CancellationToken cancellationToken)
    {
        var spec = new Specifications.PipelineByIdSpec(command.Id);
        var pipeline = await _pipelineRepository.FirstOrDefaultAsync(spec, cancellationToken);

        if (pipeline is null)
        {
            return Result.Failure<Features.Crm.DTOs.PipelineDto>(
                Error.NotFound($"Pipeline with ID '{command.Id}' not found.", "NOIR-CRM-030"));
        }

        // Cannot delete default pipeline
        if (pipeline.IsDefault)
        {
            return Result.Failure<Features.Crm.DTOs.PipelineDto>(
                Error.Validation("Id", "Cannot delete the default pipeline."));
        }

        // Check for active leads
        var activeLeadsSpec = new Specifications.ActiveLeadsByPipelineSpec(command.Id);
        var activeLeads = await _leadRepository.CountAsync(activeLeadsSpec, cancellationToken);
        if (activeLeads > 0)
        {
            return Result.Failure<Features.Crm.DTOs.PipelineDto>(
                Error.Validation("Id", "Cannot delete pipeline with active leads."));
        }

        var dto = MapToDto(pipeline);
        _pipelineRepository.Remove(pipeline);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(dto);
    }

    private static Features.Crm.DTOs.PipelineDto MapToDto(Pipeline p) =>
        new(p.Id, p.Name, p.IsDefault,
            p.Stages.OrderBy(s => s.SortOrder)
                .Select(s => new Features.Crm.DTOs.PipelineStageDto(s.Id, s.Name, s.SortOrder, s.Color))
                .ToList(),
            p.CreatedAt, p.ModifiedAt);
}
