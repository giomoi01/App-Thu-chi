<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    title: "e-Money API Documentation",
    version: "1.0.0",
    description: "Hệ thống REST API quản lý tài chính cá nhân e-Money"
)]
#[OA\Server(
    url: "/api",
    description: "Cổng API chính"
)]
#[OA\SecurityScheme(
    securityScheme: "sanctum",
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Chỉ cần dán mã Token vào đây (không cần gõ chữ Bearer)"
)]
abstract class Controller
{
    //
}
