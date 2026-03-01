using NOIR.Domain.Entities.Pm;

namespace NOIR.Domain.UnitTests.Entities.Pm;

/// <summary>
/// Unit tests for the TaskComment entity.
/// Tests factory method and edit behavior.
/// </summary>
public class TaskCommentTests
{
    private const string TestTenantId = "test-tenant";
    private static readonly Guid TestTaskId = Guid.NewGuid();
    private static readonly Guid TestAuthorId = Guid.NewGuid();

    #region Create Factory Tests

    [Fact]
    public void Create_ShouldSetAllProperties_AndIsEditedFalse()
    {
        // Act
        var comment = TaskComment.Create(TestTaskId, TestAuthorId, "This is a comment", TestTenantId);

        // Assert
        comment.Should().NotBeNull();
        comment.Id.Should().NotBe(Guid.Empty);
        comment.TaskId.Should().Be(TestTaskId);
        comment.AuthorId.Should().Be(TestAuthorId);
        comment.Content.Should().Be("This is a comment");
        comment.IsEdited.Should().BeFalse();
        comment.TenantId.Should().Be(TestTenantId);
    }

    [Fact]
    public void Create_WithEmptyContent_ShouldThrow()
    {
        // Act & Assert
        var act = () => TaskComment.Create(TestTaskId, TestAuthorId, "", TestTenantId);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldTrimContent()
    {
        // Act
        var comment = TaskComment.Create(TestTaskId, TestAuthorId, "  Padded content  ", TestTenantId);

        // Assert
        comment.Content.Should().Be("Padded content");
    }

    #endregion

    #region Edit Tests

    [Fact]
    public void Edit_ShouldUpdateContent_AndSetIsEditedTrue()
    {
        // Arrange
        var comment = TaskComment.Create(TestTaskId, TestAuthorId, "Original", TestTenantId);

        // Act
        comment.Edit("Updated content");

        // Assert
        comment.Content.Should().Be("Updated content");
        comment.IsEdited.Should().BeTrue();
    }

    [Fact]
    public void Edit_WithEmptyContent_ShouldThrow()
    {
        // Arrange
        var comment = TaskComment.Create(TestTaskId, TestAuthorId, "Original", TestTenantId);

        // Act & Assert
        var act = () => comment.Edit("");
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Edit_ShouldTrimContent()
    {
        // Arrange
        var comment = TaskComment.Create(TestTaskId, TestAuthorId, "Original", TestTenantId);

        // Act
        comment.Edit("  Edited  ");

        // Assert
        comment.Content.Should().Be("Edited");
    }

    #endregion
}
