namespace NOIR.Domain.Events.Crm;

/// <summary>
/// Raised when a lead is marked as won.
/// </summary>
public record LeadWonEvent(Guid LeadId, Guid ContactId, Guid? CustomerId) : DomainEvent;

/// <summary>
/// Raised when a lead is marked as lost.
/// </summary>
public record LeadLostEvent(Guid LeadId, string? Reason) : DomainEvent;

/// <summary>
/// Raised when a previously won or lost lead is reopened.
/// </summary>
public record LeadReopenedEvent(Guid LeadId) : DomainEvent;
