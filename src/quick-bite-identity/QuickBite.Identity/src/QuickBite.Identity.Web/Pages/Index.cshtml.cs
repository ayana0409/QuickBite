using Microsoft.AspNetCore.Authorization;

namespace QuickBite.Identity.Web.Pages;

[Authorize]
public class IndexModel : IdentityPageModel
{
    public void OnGet()
    {

    }
}
