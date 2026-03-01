using NOIR.Domain.Entities.Pm;

namespace NOIR.Domain.UnitTests.Entities.Pm;

/// <summary>
/// Unit tests for the ProjectTask entity.
/// Tests factory method, update, move, status changes, complete, and cancel lifecycle.
/// </summary>
public class ProjectTaskTests
{
    private const string TestTenantId = "test-tenant";
    private static readonly Guid TestProjectId = Guid.NewGuid();
    private static readonly Guid TestColumnId = Guid.NewGuid();

    private static ProjectTask CreateTodoTask() =>
        ProjectTask.Create(TestProjectId, "PRJ-1", "Test Task", TestTenantId,
            columnId: TestColumnId);

    #region Create Factory Tests

    [Fact]
    public void Create_ShouldSetAllProperties_AndDefaultStatusTodo()
    {
        // Arrange
        var assigneeId = Guid.NewGuid();
        var reporterId = Guid.NewGuid();
        var parentTaskId = Guid.NewGuid();
        var columnId = Guid.NewGuid();

        // Act
        var task = ProjectTask.Create(
            TestProjectId, "PRJ-42", "Implement Feature", TestTenantId,
            description: "Build the thing", priority: TaskPriority.High,
            assigneeId: assigneeId, reporterId: reporterId,
            dueDate: DateTimeOffset.UtcNow.AddDays(7),
            estimatedHours: 8m, parentTaskId: parentTaskId,
            columnId: columnId, sortOrder: 2.5);

        // Assert
        task.Should().NotBeNull();
        task.Id.Should().NotBe(Guid.Empty);
        task.ProjectId.Should().Be(TestProjectId);
        task.TaskNumber.Should().Be("PRJ-42");
        task.Title.Should().Be("Implement Feature");
        task.Description.Should().Be("Build the thing");
        task.Status.Should().Be(ProjectTaskStatus.Todo);
        task.Priority.Should().Be(TaskPriority.High);
        task.AssigneeId.Should().Be(assigneeId);
        task.ReporterId.Should().Be(reporterId);
        task.DueDate.Should().NotBeNull();
        task.EstimatedHours.Should().Be(8m);
        task.ParentTaskId.Should().Be(parentTaskId);
        task.ColumnId.Should().Be(columnId);
        task.SortOrder.Should().Be(2.5);
        task.CompletedAt.Should().BeNull();
        task.TenantId.Should().Be(TestTenantId);
    }

    [Fact]
    public void Create_WithDefaults_ShouldUseDefaultValues()
    {
        // Act
        var task = ProjectTask.Create(TestProjectId, "PRJ-1", "Simple Task", TestTenantId);

        // Assert
        task.Status.Should().Be(ProjectTaskStatus.Todo);
        task.Priority.Should().Be(TaskPriority.Medium);
        task.Description.Should().BeNull();
        task.AssigneeId.Should().BeNull();
        task.ReporterId.Should().BeNull();
        task.DueDate.Should().BeNull();
        task.EstimatedHours.Should().BeNull();
        task.ParentTaskId.Should().BeNull();
        task.ColumnId.Should().BeNull();
        task.SortOrder.Should().Be(0);
    }

    [Fact]
    public void Create_WithEmptyTitle_ShouldThrow()
    {
        // Act & Assert
        var act = () => ProjectTask.Create(TestProjectId, "PRJ-1", "", TestTenantId);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithEmptyTaskNumber_ShouldThrow()
    {
        // Act & Assert
        var act = () => ProjectTask.Create(TestProjectId, "", "Title", TestTenantId);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithAssignee_ShouldRaiseTaskAssignedEvent()
    {
        // Arrange
        var assigneeId = Guid.NewGuid();

        // Act
        var task = ProjectTask.Create(TestProjectId, "PRJ-1", "Task", TestTenantId,
            assigneeId: assigneeId);

        // Assert
        task.DomainEvents.Should().ContainSingle(e => e is Events.Pm.TaskAssignedEvent);
    }

    [Fact]
    public void Create_WithoutAssignee_ShouldNotRaiseEvent()
    {
        // Act
        var task = ProjectTask.Create(TestProjectId, "PRJ-1", "Task", TestTenantId);

        // Assert
        task.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void Create_ShouldTrimTitle()
    {
        // Act
        var task = ProjectTask.Create(TestProjectId, "PRJ-1", "  Padded Title  ", TestTenantId);

        // Assert
        task.Title.Should().Be("Padded Title");
    }

    #endregion

    #region Update Tests

    [Fact]
    public void Update_ShouldUpdateProperties()
    {
        // Arrange
        var task = CreateTodoTask();
        var assigneeId = Guid.NewGuid();

        // Act
        task.Update(
            "Updated Title", "New description", TaskPriority.Urgent,
            assigneeId, Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddDays(14), 16m, 4m);

        // Assert
        task.Title.Should().Be("Updated Title");
        task.Description.Should().Be("New description");
        task.Priority.Should().Be(TaskPriority.Urgent);
        task.AssigneeId.Should().Be(assigneeId);
        task.EstimatedHours.Should().Be(16m);
        task.ActualHours.Should().Be(4m);
    }

    [Fact]
    public void Update_WithNewAssignee_ShouldRaiseTaskAssignedEvent()
    {
        // Arrange
        var task = CreateTodoTask();
        var newAssigneeId = Guid.NewGuid();

        // Act
        task.Update("Title", null, TaskPriority.Medium, newAssigneeId, null, null, null, null);

        // Assert
        task.DomainEvents.Should().ContainSingle(e => e is Events.Pm.TaskAssignedEvent);
    }

    [Fact]
    public void Update_WithSameAssignee_ShouldNotRaiseEvent()
    {
        // Arrange
        var assigneeId = Guid.NewGuid();
        var task = ProjectTask.Create(TestProjectId, "PRJ-1", "Task", TestTenantId,
            assigneeId: assigneeId);
        task.ClearDomainEvents();

        // Act
        task.Update("Title", null, TaskPriority.Medium, assigneeId, null, null, null, null);

        // Assert
        task.DomainEvents.Should().BeEmpty();
    }

    #endregion

    #region MoveToColumn Tests

    [Fact]
    public void MoveToColumn_ShouldUpdateColumnIdAndSortOrder()
    {
        // Arrange
        var task = CreateTodoTask();
        var newColumnId = Guid.NewGuid();

        // Act
        task.MoveToColumn(newColumnId, 5.0);

        // Assert
        task.ColumnId.Should().Be(newColumnId);
        task.SortOrder.Should().Be(5.0);
    }

    #endregion

    #region ChangeStatus Tests

    [Fact]
    public void ChangeStatus_ToDone_ShouldSetCompletedAt_AndRaiseEvent()
    {
        // Arrange
        var task = CreateTodoTask();
        var beforeChange = DateTimeOffset.UtcNow;

        // Act
        task.ChangeStatus(ProjectTaskStatus.Done);

        // Assert
        task.Status.Should().Be(ProjectTaskStatus.Done);
        task.CompletedAt.Should().NotBeNull();
        task.CompletedAt.Should().BeOnOrAfter(beforeChange);
        task.DomainEvents.Should().ContainSingle(e => e is Events.Pm.TaskCompletedEvent);
    }

    [Fact]
    public void ChangeStatus_ToInProgress_ShouldClearCompletedAt()
    {
        // Arrange
        var task = CreateTodoTask();
        task.ChangeStatus(ProjectTaskStatus.Done); // first complete
        task.ClearDomainEvents();

        // Act
        task.ChangeStatus(ProjectTaskStatus.InProgress);

        // Assert
        task.Status.Should().Be(ProjectTaskStatus.InProgress);
        task.CompletedAt.Should().BeNull();
    }

    #endregion

    #region Complete Tests

    [Fact]
    public void Complete_ShouldSetStatusDone_AndCompletedAt_AndRaiseEvent()
    {
        // Arrange
        var task = CreateTodoTask();
        var beforeComplete = DateTimeOffset.UtcNow;

        // Act
        task.Complete();

        // Assert
        task.Status.Should().Be(ProjectTaskStatus.Done);
        task.CompletedAt.Should().NotBeNull();
        task.CompletedAt.Should().BeOnOrAfter(beforeComplete);
        task.DomainEvents.Should().ContainSingle(e => e is Events.Pm.TaskCompletedEvent);
    }

    [Fact]
    public void Complete_WhenAlreadyDone_ShouldThrow()
    {
        // Arrange
        var task = CreateTodoTask();
        task.Complete();

        // Act & Assert
        var act = () => task.Complete();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Task is already completed.");
    }

    #endregion

    #region Cancel Tests

    [Fact]
    public void Cancel_ShouldSetStatusCancelled()
    {
        // Arrange
        var task = CreateTodoTask();

        // Act
        task.Cancel();

        // Assert
        task.Status.Should().Be(ProjectTaskStatus.Cancelled);
    }

    [Fact]
    public void Cancel_WhenAlreadyCancelled_ShouldThrow()
    {
        // Arrange
        var task = CreateTodoTask();
        task.Cancel();

        // Act & Assert
        var act = () => task.Cancel();
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Task is already cancelled.");
    }

    #endregion
}
