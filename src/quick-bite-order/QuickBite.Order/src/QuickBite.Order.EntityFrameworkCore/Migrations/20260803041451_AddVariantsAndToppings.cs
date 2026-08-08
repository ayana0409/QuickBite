using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuickBite.Order.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantsAndToppings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SelectedToppings",
                table: "OrderItems",
                type: "longtext",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "SelectedVariantName",
                table: "OrderItems",
                type: "longtext",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Toppings",
                table: "Order_FoodItems",
                type: "longtext",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "Variants",
                table: "Order_FoodItems",
                type: "longtext",
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SelectedToppings",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "SelectedVariantName",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "Toppings",
                table: "Order_FoodItems");

            migrationBuilder.DropColumn(
                name: "Variants",
                table: "Order_FoodItems");
        }
    }
}
