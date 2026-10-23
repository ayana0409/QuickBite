using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using QuickBite.Identity.Application.Contracts.Auth;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;

namespace QuickBite.Identity.Web.Pages.Auth;

public class LoginModel : AbpPageModel
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public LoginModel(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    [BindProperty]
    public LoginInputDto LoginInput { get; set; } = new();

    [BindProperty(SupportsGet = true)]
    public string? ReturnUrl { get; set; }

    public string QuickBiteUrl { get; set; } = "https://quickbite-wnkc.onrender.com";
    public string ShorterLinkUrl { get; set; } = "https://shink.onrender.com";
    public string QuickTestUrl { get; set; } = "https://quicktest-kappa.vercel.app/";

    public void OnGet()
    {
        PopulateEcosystemUrls();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        PopulateEcosystemUrls();

        if (!ModelState.IsValid)
        {
            return Page();
        }

        try
        {
            var result = await _authService.LoginAsync(LoginInput);
            if (result.Success)
            {
                if (!string.IsNullOrWhiteSpace(ReturnUrl))
                {
                    return Redirect(ReturnUrl);
                }
                return Redirect("~/");
            }
            else
            {
                ModelState.AddModelError(
                    string.Empty,
                    result.ErrorMessage ?? "Username hoặc Password không đúng."
                );
                return Page();
            }
        }
        catch (Exception ex)
        {
            ModelState.AddModelError(
                string.Empty,
                $"Đã xảy ra lỗi trong quá trình đăng nhập: {ex.Message}"
            );
            return Page();
        }
    }

    private void PopulateEcosystemUrls()
    {
        QuickBiteUrl = _configuration["Ecosystem:QuickBiteUrl"] 
                       ?? Environment.GetEnvironmentVariable("ECOSYSTEM_QUICKBITE_URL") 
                       ?? "https://quickbite-wnkc.onrender.com";

        ShorterLinkUrl = _configuration["Ecosystem:ShorterLinkUrl"] 
                         ?? Environment.GetEnvironmentVariable("ECOSYSTEM_SHORTERLINK_URL") 
                         ?? "https://shink.onrender.com";

        QuickTestUrl = _configuration["Ecosystem:QuickTestUrl"] 
                       ?? Environment.GetEnvironmentVariable("ECOSYSTEM_QUICKTEST_URL") 
                       ?? "https://quicktest-kappa.vercel.app/";
    }
}