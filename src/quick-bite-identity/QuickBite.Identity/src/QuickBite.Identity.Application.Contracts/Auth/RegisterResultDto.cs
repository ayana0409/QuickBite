using System;

namespace QuickBite.Identity.Application.Contracts.Auth;

public class RegisterResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? Email { get; set; }
}
