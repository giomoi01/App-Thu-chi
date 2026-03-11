<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class CategoryController extends Controller
{
    #[OA\Get(
        path: '/categories',
        summary: 'Lấy danh sách danh mục (gồm mặc định và cá nhân)',
        tags: ['Danh mục'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Dữ liệu danh mục')
        ]
    )]
    public function index(Request $request)
    {
        $categories = Category::where('is_default', true)
            ->orWhere('user_id', $request->user()->id)
            ->with('children')
            ->whereNull('parent_id')
            ->get();

        return CategoryResource::collection($categories);
    }

    #[OA\Post(
        path: '/categories',
        summary: 'Tạo danh mục mới',
        tags: ['Danh mục'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'type', type: 'string', example: 'expense'),
                    new OA\Property(property: 'name', type: 'string', example: 'Cà phê'),
                    new OA\Property(property: 'icon', type: 'string', example: 'Coffee'),
                    new OA\Property(property: 'parent_id', type: 'integer', example: null)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Đã tạo thành công'),
            new OA\Response(response: 422, description: 'Dữ liệu sai định dạng')
        ]
    )]
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|string|in:income,expense',
            'parent_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category = $request->user()->categories()->create([
            'type' => $request->type,
            'parent_id' => $request->parent_id,
            'name' => $request->name,
            'icon' => $request->icon,
            'is_default' => false,
        ]);

        return new CategoryResource($category);
    }

    #[OA\Put(
        path: '/categories/{id}',
        summary: 'Cập nhật danh mục',
        tags: ['Danh mục'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Cà phê sáng'),
                    new OA\Property(property: 'icon', type: 'string', example: 'Coffee')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đã cập nhật'),
            new OA\Response(response: 404, description: 'Không tìm thấy hoặc không có quyền')
        ]
    )]
    public function update(Request $request, string $id)
    {
        // Chỉ cho sửa danh mục của chính mình
        $category = $request->user()->categories()->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'icon' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category->update($request->only(['name', 'icon', 'parent_id']));

        return new CategoryResource($category);
    }

    #[OA\Delete(
        path: '/categories/{id}',
        summary: 'Xóa danh mục',
        tags: ['Danh mục'],
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
        $category = $request->user()->categories()->findOrFail($id);
        $category->delete();

        return response()->json(['message' => 'Đã xóa danh mục thành công.']);
    }
}
