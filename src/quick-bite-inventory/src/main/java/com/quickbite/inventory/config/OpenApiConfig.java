package com.quickbite.inventory.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("QuickBite Inventory Service API")
                        .version("1.0.0")
                        .description("REST APIs for managing stock, inventory CRUD (Nhập/xuất kho), and Saga stock reservations.")
                        .contact(new Contact()
                                .name("QuickBite Engineering")
                                .email("engineering@quickbite.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}
