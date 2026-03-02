using NOIR.Application.Features.Media.Dtos;
using NOIR.Application.Features.Media.Queries.GetMediaFileById;
using NOIR.Application.Specifications.MediaFiles;

namespace NOIR.Application.UnitTests.Features.Media.Queries;

/// <summary>
/// Unit tests for GetMediaFileByIdQueryHandler.
/// Tests retrieval of a single media file by ID.
/// </summary>
public class GetMediaFileByIdQueryHandlerTests
{
    #region Test Setup

    private readonly Mock<IRepository<MediaFile, Guid>> _repositoryMock;
    private readonly GetMediaFileByIdQueryHandler _handler;

    public GetMediaFileByIdQueryHandlerTests()
    {
        _repositoryMock = new Mock<IRepository<MediaFile, Guid>>();
        _handler = new GetMediaFileByIdQueryHandler(_repositoryMock.Object);
    }

    private static MediaFile CreateTestMediaFile(Guid? id = null)
    {
        var mediaFile = MediaFile.Create(
            shortId: "abc12345",
            slug: "test-image_abc12345",
            originalFileName: "test-image.jpg",
            folder: "blog",
            defaultUrl: "/uploads/blog/test-image.webp",
            thumbHash: "dGVzdA==",
            dominantColor: "#FF5733",
            width: 1920,
            height: 1080,
            format: "jpeg",
            mimeType: "image/jpeg",
            sizeBytes: 250_000,
            hasTransparency: false,
            variantsJson: "[]",
            srcsetsJson: "{}",
            uploadedBy: "user-1",
            tenantId: "test-tenant");

        if (id.HasValue)
        {
            typeof(MediaFile).GetProperty("Id")!.SetValue(mediaFile, id.Value);
        }

        return mediaFile;
    }

    #endregion

    #region Success Scenarios

    [Fact]
    public async Task Handle_WithExistingMediaFile_ShouldReturnDto()
    {
        // Arrange
        var mediaFileId = Guid.NewGuid();
        var mediaFile = CreateTestMediaFile(mediaFileId);
        var query = new GetMediaFileByIdQuery(mediaFileId);

        _repositoryMock
            .Setup(x => x.FirstOrDefaultAsync(
                It.IsAny<MediaFileByIdSpec>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(mediaFile);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(mediaFileId);
        result.Value.OriginalFileName.Should().Be("test-image.jpg");
        result.Value.Folder.Should().Be("blog");
        result.Value.Width.Should().Be(1920);
        result.Value.Height.Should().Be(1080);
        result.Value.Format.Should().Be("jpeg");
        result.Value.MimeType.Should().Be("image/jpeg");
        result.Value.SizeBytes.Should().Be(250_000);
    }

    [Fact]
    public async Task Handle_ShouldMapAllDtoFields()
    {
        // Arrange
        var mediaFileId = Guid.NewGuid();
        var mediaFile = CreateTestMediaFile(mediaFileId);
        var query = new GetMediaFileByIdQuery(mediaFileId);

        _repositoryMock
            .Setup(x => x.FirstOrDefaultAsync(
                It.IsAny<MediaFileByIdSpec>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(mediaFile);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var dto = result.Value;
        dto.ShortId.Should().Be("abc12345");
        dto.Slug.Should().Be("test-image_abc12345");
        dto.DefaultUrl.Should().Be("/uploads/blog/test-image.webp");
        dto.ThumbHash.Should().Be("dGVzdA==");
        dto.DominantColor.Should().Be("#FF5733");
        dto.HasTransparency.Should().BeFalse();
        dto.Variants.Should().BeEmpty();
        dto.Srcsets.Should().BeEmpty();
    }

    #endregion

    #region Failure Scenarios

    [Fact]
    public async Task Handle_WithNonExistentMediaFile_ShouldReturnNotFoundError()
    {
        // Arrange
        var query = new GetMediaFileByIdQuery(Guid.NewGuid());

        _repositoryMock
            .Setup(x => x.FirstOrDefaultAsync(
                It.IsAny<MediaFileByIdSpec>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((MediaFile?)null);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("NOIR-MEDIA-001");
    }

    #endregion
}
