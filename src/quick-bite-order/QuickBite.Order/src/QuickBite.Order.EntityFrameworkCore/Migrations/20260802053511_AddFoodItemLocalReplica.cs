using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuickBite.Order.Migrations
{
    /// <inheritdoc />
    public partial class AddFoodItemLocalReplica : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AbpEventInbox",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    MessageId = table.Column<string>(type: "varchar(255)", nullable: false),
                    EventName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    EventData = table.Column<byte[]>(type: "longblob", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    HandledTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    RetryCount = table.Column<int>(type: "int", nullable: false),
                    NextRetryTime = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpEventInbox", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AbpEventOutbox",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    ExtraProperties = table.Column<string>(type: "longtext", nullable: false),
                    EventName = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    EventData = table.Column<byte[]>(type: "longblob", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AbpEventOutbox", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Order_FoodItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    Name = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Order_FoodItems", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AbpEventInbox_MessageId",
                table: "AbpEventInbox",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_AbpEventInbox_Status_CreationTime",
                table: "AbpEventInbox",
                columns: new[] { "Status", "CreationTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AbpEventOutbox_CreationTime",
                table: "AbpEventOutbox",
                column: "CreationTime");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AbpEventInbox");

            migrationBuilder.DropTable(
                name: "AbpEventOutbox");

            migrationBuilder.DropTable(
                name: "Order_FoodItems");
        }
    }
}
