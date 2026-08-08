using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using QuickBite.Identity.Application.Contracts.Auth;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;
namespace QuickBite.Identity.Web.Pages.Auth;

public class LoginModel : AbpPageModel
{
    private readonly IAuthService _authService;

    public LoginModel(IAuthService authService)
    {
        _authService = authService;
    }

    [BindProperty]
    public LoginInputDto LoginInput { get; set; } = new();

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        try
        {
            var result = await _authService.LoginAsync(LoginInput);
            if (result.Success)
                return Redirect("~/");
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
}