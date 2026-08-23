using System;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;

namespace QuickBite.Identity.Web.Pages;

[Authorize]
public class IndexModel : IdentityPageModel
{
    private readonly IConfiguration _configuration;

    public IndexModel(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string QuickBiteUrl { get; set; } = "https://quickbite-wnkc.onrender.com";
    public string ShorterLinkUrl { get; set; } = "https://shink.onrender.com";

    public void OnGet()
    {
        // Read from configuration (appsettings / environment variables) with resilient fallbacks
        QuickBiteUrl = _configuration["Ecosystem:QuickBiteUrl"] 
                       ?? Environment.GetEnvironmentVariable("ECOSYSTEM_QUICKBITE_URL") 
                       ?? "https://quickbite-wnkc.onrender.com";

        ShorterLinkUrl = _configuration["Ecosystem:ShorterLinkUrl"] 
                         ?? Environment.GetEnvironmentVariable("ECOSYSTEM_SHORTERLINK_URL") 
                         ?? "https://shink.onrender.com";
    }
}
