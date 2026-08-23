using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace QuickBite.Identity.Web.Pages.Account;

[AllowAnonymous]
public class LoginModel : PageModel
{
    // Redirect all GET requests for /Account/Login to the Quick Universe /auth/login portal
    public IActionResult OnGet(string? returnUrl = null)
    {
        return RedirectToPage("/Auth/Login", new { returnUrl });
    }

    // Redirect all POST requests for /Account/Login to the Quick Universe /auth/login portal
    public IActionResult OnPost(string? returnUrl = null)
    {
        return RedirectToPage("/Auth/Login", new { returnUrl });
    }
}
