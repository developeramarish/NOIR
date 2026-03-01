using NOIR.Domain.Entities.Crm;

namespace NOIR.Domain.UnitTests.Entities;

/// <summary>
/// Unit tests for the Pipeline and PipelineStage entities.
/// Tests factory methods, stage management, and default flag.
/// </summary>
public class PipelineTests
{
    private const string TestTenantId = "test-tenant";

    #region Pipeline Create Tests

    [Fact]
    public void Create_ShouldSetName_AndIsDefault()
    {
        // Act
        var pipeline = Pipeline.Create("Sales Pipeline", TestTenantId, isDefault: true);

        // Assert
        pipeline.Should().NotBeNull();
        pipeline.Id.Should().NotBe(Guid.Empty);
        pipeline.Name.Should().Be("Sales Pipeline");
        pipeline.IsDefault.Should().BeTrue();
        pipeline.TenantId.Should().Be(TestTenantId);
        pipeline.Stages.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithDefaultFalse_ShouldNotBeDefault()
    {
        // Act
        var pipeline = Pipeline.Create("Custom Pipeline", TestTenantId);

        // Assert
        pipeline.IsDefault.Should().BeFalse();
    }

    [Fact]
    public void Create_WithEmptyName_ShouldThrow()
    {
        // Act & Assert
        var act = () => Pipeline.Create("", TestTenantId);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_ShouldTrimName()
    {
        // Act
        var pipeline = Pipeline.Create("  Sales  ", TestTenantId);

        // Assert
        pipeline.Name.Should().Be("Sales");
    }

    #endregion

    #region Update Tests

    [Fact]
    public void Update_ShouldChangeName()
    {
        // Arrange
        var pipeline = Pipeline.Create("Old Name", TestTenantId);

        // Act
        pipeline.Update("New Name");

        // Assert
        pipeline.Name.Should().Be("New Name");
    }

    #endregion

    #region SetDefault Tests

    [Fact]
    public void SetDefault_ShouldUpdateIsDefault()
    {
        // Arrange
        var pipeline = Pipeline.Create("Pipeline", TestTenantId, isDefault: false);

        // Act
        pipeline.SetDefault(true);

        // Assert
        pipeline.IsDefault.Should().BeTrue();
    }

    [Fact]
    public void SetDefault_False_ShouldClearDefault()
    {
        // Arrange
        var pipeline = Pipeline.Create("Pipeline", TestTenantId, isDefault: true);

        // Act
        pipeline.SetDefault(false);

        // Assert
        pipeline.IsDefault.Should().BeFalse();
    }

    #endregion

    #region PipelineStage Create Tests

    [Fact]
    public void PipelineStage_Create_ShouldSetAllProperties()
    {
        // Arrange
        var pipelineId = Guid.NewGuid();

        // Act
        var stage = PipelineStage.Create(pipelineId, "Qualification", 1, TestTenantId, "#3B82F6");

        // Assert
        stage.Should().NotBeNull();
        stage.Id.Should().NotBe(Guid.Empty);
        stage.PipelineId.Should().Be(pipelineId);
        stage.Name.Should().Be("Qualification");
        stage.SortOrder.Should().Be(1);
        stage.Color.Should().Be("#3B82F6");
        stage.TenantId.Should().Be(TestTenantId);
    }

    [Fact]
    public void PipelineStage_Create_WithDefaultColor_ShouldUseDefault()
    {
        // Act
        var stage = PipelineStage.Create(Guid.NewGuid(), "New", 0, TestTenantId);

        // Assert
        stage.Color.Should().Be("#6366f1");
    }

    [Fact]
    public void PipelineStage_Create_WithEmptyName_ShouldThrow()
    {
        // Act & Assert
        var act = () => PipelineStage.Create(Guid.NewGuid(), "", 0, TestTenantId);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void PipelineStage_Update_ShouldModifyProperties()
    {
        // Arrange
        var stage = PipelineStage.Create(Guid.NewGuid(), "Old", 0, TestTenantId, "#000000");

        // Act
        stage.Update("New Stage", 2, "#FF0000");

        // Assert
        stage.Name.Should().Be("New Stage");
        stage.SortOrder.Should().Be(2);
        stage.Color.Should().Be("#FF0000");
    }

    #endregion
}
