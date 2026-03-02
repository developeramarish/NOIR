using NOIR.Application.Features.Crm.Queries.GetActivityById;
using NOIR.Domain.Entities.Crm;

namespace NOIR.Application.UnitTests.Features.Crm.Queries;

public class GetActivityByIdQueryHandlerTests
{
    private readonly Mock<IRepository<CrmActivity, Guid>> _activityRepoMock;
    private readonly GetActivityByIdQueryHandler _handler;

    private const string TestTenantId = "tenant-123";

    public GetActivityByIdQueryHandlerTests()
    {
        _activityRepoMock = new Mock<IRepository<CrmActivity, Guid>>();
        _handler = new GetActivityByIdQueryHandler(_activityRepoMock.Object);
    }

    [Fact]
    public async Task Handle_ExistingActivity_ShouldReturnDto()
    {
        // Arrange
        var activity = CrmActivity.Create(
            ActivityType.Call, "Follow-up call", Guid.NewGuid(),
            DateTimeOffset.UtcNow.AddHours(-1), TestTenantId,
            description: "Discussed pricing",
            contactId: Guid.NewGuid(),
            durationMinutes: 30);

        _activityRepoMock
            .Setup(x => x.FirstOrDefaultAsync(It.IsAny<ActivityByIdReadOnlySpec>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(activity);

        var query = new GetActivityByIdQuery(activity.Id);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(activity.Id);
        result.Value.Subject.Should().Be("Follow-up call");
        result.Value.Type.Should().Be(ActivityType.Call);
        result.Value.DurationMinutes.Should().Be(30);
    }

    [Fact]
    public async Task Handle_NonExistentActivity_ShouldReturnNotFound()
    {
        // Arrange
        _activityRepoMock
            .Setup(x => x.FirstOrDefaultAsync(It.IsAny<ActivityByIdReadOnlySpec>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CrmActivity?)null);

        var query = new GetActivityByIdQuery(Guid.NewGuid());

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
    }
}
