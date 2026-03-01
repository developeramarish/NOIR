namespace NOIR.Domain.Entities.Crm;

/// <summary>
/// A stage within a CRM pipeline (e.g., Qualification, Proposal, Negotiation).
/// </summary>
public class PipelineStage : TenantEntity<Guid>
{
    public Guid PipelineId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public int SortOrder { get; private set; }
    public string Color { get; private set; } = "#6366f1";

    // Navigation properties
    public virtual Pipeline? Pipeline { get; private set; }

    // Private constructor for EF Core
    private PipelineStage() : base() { }

    private PipelineStage(Guid id, string? tenantId) : base(id, tenantId) { }

    /// <summary>
    /// Factory method to create a new pipeline stage.
    /// </summary>
    public static PipelineStage Create(
        Guid pipelineId,
        string name,
        int sortOrder,
        string? tenantId,
        string color = "#6366f1")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        return new PipelineStage(Guid.NewGuid(), tenantId)
        {
            PipelineId = pipelineId,
            Name = name.Trim(),
            SortOrder = sortOrder,
            Color = color
        };
    }

    /// <summary>
    /// Updates stage details.
    /// </summary>
    public void Update(string name, int sortOrder, string color)
    {
        Name = name.Trim();
        SortOrder = sortOrder;
        Color = color;
    }
}
