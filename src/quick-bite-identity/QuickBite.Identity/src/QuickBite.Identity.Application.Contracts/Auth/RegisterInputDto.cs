using System.ComponentModel.DataAnnotations;

namespace QuickBite.Identity.Application.Contracts.Auth;

public class RegisterInputDto
{
    [Required(ErrorMessage = "Tên đăng nhập không được để trống")]
    [StringLength(256, MinimumLength = 3, ErrorMessage = "Tên đăng nhập phải từ 3 đến 256 ký tự")]
    public string UserName { get; set; } = default!;

    [Required(ErrorMessage = "Email không được để trống")]
    [EmailAddress(ErrorMessage = "Địa chỉ email không hợp lệ")]
    [StringLength(256, ErrorMessage = "Email không được vượt quá 256 ký tự")]
    public string EmailAddress { get; set; } = default!;

    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    [StringLength(128, MinimumLength = 6, ErrorMessage = "Mật khẩu phải từ 6 đến 128 ký tự")]
    public string Password { get; set; } = default!;

    [StringLength(64, ErrorMessage = "Họ và tên không được vượt quá 64 ký tự")]
    public string? Name { get; set; }

    [StringLength(32, ErrorMessage = "Số điện thoại không được vượt quá 32 ký tự")]
    public string? PhoneNumber { get; set; }
}
