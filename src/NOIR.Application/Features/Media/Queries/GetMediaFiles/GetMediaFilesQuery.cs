namespace NOIR.Application.Features.Media.Queries.GetMediaFiles;

/// <summary>
/// Query to get paginated list of media files with filtering and sorting.
/// </summary>
public sealed record GetMediaFilesQuery(
    string? Search = null,
    string? FileType = null,
    string? Folder = null,
    string SortBy = "createdAt",
    string SortOrder = "desc",
    int Page = 1,
    int PageSize = 24);
