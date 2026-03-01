namespace NOIR.Application.Features.Pm.Commands.DeleteTaskComment;

public class DeleteTaskCommentCommandHandler
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteTaskCommentCommandHandler(
        IApplicationDbContext dbContext,
        IUnitOfWork unitOfWork)
    {
        _dbContext = dbContext;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Features.Pm.DTOs.TaskCommentDto>> Handle(
        DeleteTaskCommentCommand command,
        CancellationToken cancellationToken)
    {
        var comment = await _dbContext.TaskComments
            .Include(c => c.Author!)
            .TagWith("DeleteTaskComment_Fetch")
            .FirstOrDefaultAsync(c => c.Id == command.CommentId, cancellationToken);

        if (comment is null)
        {
            return Result.Failure<Features.Pm.DTOs.TaskCommentDto>(
                Error.NotFound($"Comment with ID '{command.CommentId}' not found.", "NOIR-PM-008"));
        }

        var dto = new Features.Pm.DTOs.TaskCommentDto(
            comment.Id, comment.AuthorId,
            comment.Author != null ? $"{comment.Author.FirstName} {comment.Author.LastName}" : string.Empty,
            comment.Author?.AvatarUrl,
            comment.Content, comment.IsEdited, comment.CreatedAt);

        _dbContext.TaskComments.Remove(comment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(dto);
    }
}
