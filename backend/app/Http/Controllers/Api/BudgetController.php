<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BudgetResource;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class BudgetController extends Controller
{
    #[OA\Get(
        path: '/budgets',
        summary: 'Lấy danh sách thiết lập ngân sách',
        tags: ['Ngân sách'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách ngân sách')
        ]
    )]
    public function index(Request $request)
    {
        $budgets = $request->user()->budgets()->with('category')->get();
        return BudgetResource::collection($budgets);
    }

    #[OA\Post(
        path: '/budgets',
        summary: 'Thiết lập ngân sách chi tiêu',
        tags: ['Ngân sách'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'category_id', type: 'integer', example: 1),
                    new OA\Property(property: 'limit_amount', type: 'number', format: 'float', example: 5000000),
                    new OA\Property(property: 'month', type: 'string', example: '2024-03')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đã lưu thiết lập'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ')
        ]
    )]
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'category_id' => 'required|exists:categories,id',
            'limit_amount' => 'required|numeric|min:0',
            'month' => 'required|string|regex:/^\d{4}-\d{2}$/', // YYYY-MM
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Cập nhật nếu đã tồn tại ngân sách cho category trong tháng đó
        $budget = Budget::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'category_id' => $request->category_id,
                'month' => $request->month,
            ],
            [
                'limit_amount' => $request->limit_amount,
            ]
        );

        return new BudgetResource($budget);
    }

    #[OA\Delete(
        path: '/budgets/{id}',
        summary: 'Xóa thiết lập ngân sách',
        tags: ['Ngân sách'],
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
        $budget = $request->user()->budgets()->findOrFail($id);
        $budget->delete();

        return response()->json(['message' => 'Đã xóa thiết lập ngân sách.']);
    }
}
