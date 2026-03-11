<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class SettingController extends Controller
{
    #[OA\Get(
        path: '/settings',
        summary: 'Lấy toàn bộ cấu hình cài đặt',
        tags: ['Cài đặt'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách cài đặt')
        ]
    )]
    public function index(Request $request)
    {
        $settings = $request->user()->settings()->pluck('value', 'key');
        return response()->json($settings);
    }

    #[OA\Post(
        path: '/settings',
        summary: 'Lưu hoặc cập nhật cài đặt',
        tags: ['Cài đặt'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'settings', 
                        type: 'object', 
                        example: ["currency" => "VND", "language" => "vi", "dark_mode" => true]
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đã lưu'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ')
        ]
    )]
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->settings as $key => $value) {
            Setting::updateOrCreate(
                ['user_id' => $request->user()->id, 'key' => $key],
                ['value' => is_array($value) ? json_encode($value) : $value]
            );
        }

        return response()->json(['message' => 'Đã lưu cài đặt thành công.']);
    }
}
