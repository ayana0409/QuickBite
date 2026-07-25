using System.ComponentModel.DataAnnotations;

namespace QuickBite.Identity.Application.Contracts.Auth
{
    public class LoginInputDto
    {
        [Required]
        public string UserNameOrEmailAddress { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; }
    }
}