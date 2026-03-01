namespace NOIR.Application.Features.Pm.Commands.AddTaskComment;

public class AddTaskCommentCommandHandler
{
    private readonly IRepository<ProjectTask, Guid> _taskRepository;
    private readonly IRepository<Employee, Guid> _employeeRepository;
    private readonly IApplicationDbContext _dbContext;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUser _currentUser;

    public AddTaskCommentCommandHandler(
        IRepository<ProjectTask, Guid> taskRepository,
        IRepository<Employee, Guid> employeeRepository,
        IApplicationDbContext dbContext,
        IUnitOfWork unitOfWork,
        ICurrentUser currentUser)
    {
        _taskRepository = taskRepository;
        _employeeRepository = employeeRepository;
        _dbContext = dbContext;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task<Result<Features.Pm.DTOs.TaskCommentDto>> Handle(
        AddTaskCommentCommand command,
        CancellationToken cancellationToken)
    {
        // Verify task exists
        var task = await _taskRepository.GetByIdAsync(command.TaskId, cancellationToken);
        if (task is null)
        {
            return Result.Failure<Features.Pm.DTOs.TaskCommentDto>(
                Error.NotFound($"Task with ID '{command.TaskId}' not found.", "NOIR-PM-006"));
        }

        // Get current employee
        Employee? author = null;
        if (_currentUser.UserId is not null)
        {
            var employeeSpec = new Features.Hr.Specifications.EmployeeByUserIdSpec(_currentUser.UserId);
            author = await _employeeRepository.FirstOrDefaultAsync(employeeSpec, cancellationToken);
        }

        if (author is null)
        {
            return Result.Failure<Features.Pm.DTOs.TaskCommentDto>(
                Error.Validation("AuthorId", "Current user is not linked to an employee.", "NOIR-PM-007"));
        }

        var comment = TaskComment.Create(command.TaskId, author.Id, command.Content, _currentUser.TenantId);
        _dbContext.TaskComments.Add(comment);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(new Features.Pm.DTOs.TaskCommentDto(
            comment.Id, author.Id,
            $"{author.FirstName} {author.LastName}",
            author.AvatarUrl,
            comment.Content, comment.IsEdited, comment.CreatedAt));
    }
}
