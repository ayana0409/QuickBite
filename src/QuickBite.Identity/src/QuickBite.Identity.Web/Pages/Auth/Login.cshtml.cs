using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace QuickBite.Identity.Web.Pages.Auth;

public class LoginModel : PageModel
{
    [BindProperty]
    public LoginInputModel LoginInput { get; set; } = new();

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        // gọi API Login của ABP
        // POST /api/account/login

        return Redirect("~/");
    }
}