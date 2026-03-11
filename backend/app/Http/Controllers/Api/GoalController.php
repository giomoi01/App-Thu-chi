<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GoalResource;
use App\Models\Goal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class GoalController extends Controller
{
    #[OA\Get(
        path: '/goals',
        summary: 'Danh sách mục tiêu tiết kiệm',
        tags: ['Mục tiêu'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách mục tiêu')
        ]
    )]
    public function index(Request $request)
    {
        $goals = $request->user()->goals()->get();
        return GoalResource::collection($goals);
    }

    #[OA\Post(
        path: '/goals',
        summary: 'Tạo mục tiêu tiết kiệm mới',
        tags: ['Mục tiêu'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Mua xe mới'),
                    new OA\Property(property: 'target_amount', type: 'number', example: 50000000),
                    new OA\Property(property: 'deadline', type: 'string', format: 'date', example: '2024-12-31')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Đã tạo xong'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ')
        ]
    )]
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'target_amount' => 'required|numeric|min:0',
            'current_amount' => 'nullable|numeric|min:0',
            'deadline' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $goal = $request->user()->goals()->create($request->all());

        return new GoalResource($goal);
    }

    #[OA\Patch(
        path: '/goals/{id}/amount',
        summary: 'Cập nhật tiến độ tích lũy cho mục tiêu',
        tags: ['Mục tiêu'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'current_amount', type: 'number', example: 5000000)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đã cập nhật'),
            new OA\Response(response: 404, description: 'Không tìm thấy')
        ]
    )]
    public function updateProgress(Request $request, string $id)
    {
        $goal = $request->user()->goals()->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'current_amount' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $goal->update(['current_amount' => $request->current_amount]);

        return new GoalResource($goal);
    }

    #[OA\Delete(
        path: '/goals/{id}',
        summary: 'Xóa mục tiêu',
        tags: ['Mục tiêu'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa'),
            new OA\Response(response: 404, description: 'Không tìm thấy')
        ]
    )]
    public function destroy(Request $request, string $id)
    {
        $goal = $request->user()->goals()->findOrFail($id);
        $goal->delete();

        return response()->json(['message' => 'Đã xóa mục tiêu.']);
    }
}
