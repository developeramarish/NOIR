using NOIR.Domain.Entities.Pm;

namespace NOIR.Domain.UnitTests.Entities.Pm;

/// <summary>
/// Unit tests for the ProjectColumn entity.
/// Tests factory method and update.
/// </summary>
public class ProjectColumnTests
{
    private const string TestTenantId = "test-tenant";
    private static readonly Guid TestProjectId = Guid.NewGuid();

    #region Create Factory Tests

    [Fact]
    public void Create_ShouldSetAllProperties()
    {
        // Act
        var column = ProjectColumn.Create(
            TestProjectId, "In Progress", 1, TestTenantId,
            color: "#3B82F6", wipLimit: 5);

        // Assert
        column.Should().NotBeNull();
        column.Id.Should().NotBe(Guid.Empty);
        column.ProjectId.Should().Be(TestProjectId);
        column.Name.Should().Be("In Progress");
        column.SortOrder.Should().Be(1);
        column.Color.Should().Be("#3B82F6");
        column.WipLimit.Should().Be(5);
        column.TenantId.Should().Be(TestTenantId);
    }

    [Fact]
    public void Create_WithDefaults_ShouldHaveNullColorAndWipLimit()
    {
        // Act
        var column = ProjectColumn.Create(TestProjectId, "Todo", 0, TestTenantId);

        // Assert
        column.Color.Should().BeNull();
        column.WipLimit.Should().BeNull();
    }

    [Fact]
    public void Create_WithEmptyName_ShouldThrow()
    {
        // Act & Assert
        var act = () => ProjectColumn.Create(TestProjectId, "", 0, TestTenantId);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldTrimName()
    {
        // Act
        var column = ProjectColumn.Create(TestProjectId, "  Done  ", 3, TestTenantId);

        // Assert
        column.Name.Should().Be("Done");
    }

    #endregion

    #region Update Tests

    [Fact]
    public void Update_ShouldUpdateAllProperties()
    {
        // Arrange
        var column = ProjectColumn.Create(TestProjectId, "Todo", 0, TestTenantId);

        // Act
        column.Update("In Review", 2, "#F59E0B", 3);

        // Assert
        column.Name.Should().Be("In Review");
        column.SortOrder.Should().Be(2);
        column.Color.Should().Be("#F59E0B");
        column.WipLimit.Should().Be(3);
    }

    #endregion
}
