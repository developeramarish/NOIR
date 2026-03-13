using NOIR.Application.Features.Media.Dtos;
using NOIR.Application.Features.Media.Specifications;

namespace NOIR.Application.Features.Media.Queries.GetMediaFiles;

/// <summary>
/// Wolverine handler for getting a paginated list of media files.
/// </summary>
public class GetMediaFilesQueryHandler
{
    private readonly IRepository<MediaFile, Guid> _repository;

    public GetMediaFilesQueryHandler(IRepository<MediaFile, Guid> repository)
    {
        _repository = repository;
    }

    public async Task<Result<PagedResult<MediaFileListDto>>> Handle(
        GetMediaFilesQuery query,
        CancellationToken cancellationToken)
    {
        var skip = (query.Page - 1) * query.PageSize;

        var spec = new MediaFilesFilteredSpec(
            query.Search,
            query.FileType,
            query.Folder,
            query.OrderBy,
            query.IsDescending,
            skip,
            query.PageSize);

        var mediaFiles = await _repository.ListAsync(spec, cancellationToken);

        var countSpec = new MediaFilesCountSpec(
            query.Search,
            query.FileType,
            query.Folder);

        var totalCount = await _repository.CountAsync(countSpec, cancellationToken);

        var items = mediaFiles.Select(m => new MediaFileListDto(
            m.Id,
            m.ShortId,
            m.Slug,
            m.OriginalFileName,
            m.Folder,
            m.DefaultUrl,
            m.ThumbHash,
            m.DominantColor,
            m.Width,
            m.Height,
            m.Format,
            m.MimeType,
            m.SizeBytes,
            m.AltText,
            m.CreatedAt)).ToList();

        var pageIndex = query.Page - 1;
        var result = PagedResult<MediaFileListDto>.Create(items, totalCount, pageIndex, query.PageSize);

        return Result.Success(result);
    }
}
