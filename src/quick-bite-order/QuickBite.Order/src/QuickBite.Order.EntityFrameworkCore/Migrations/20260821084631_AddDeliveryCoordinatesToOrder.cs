using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuickBite.Order.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryCoordinatesToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "DeliveryAddress_Latitude",
                table: "Orders",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DeliveryAddress_Longitude",
                table: "Orders",
                type: "double",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliveryAddress_Latitude",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveryAddress_Longitude",
                table: "Orders");
        }
    }
}
