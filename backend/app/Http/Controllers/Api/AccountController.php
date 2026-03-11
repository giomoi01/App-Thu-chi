<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class AccountController extends Controller
{
    #[OA\Get(
        path: '/accounts',
        summary: 'Lấy danh sách các loại ví',
        tags: ['Ví & Tài khoản'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Dữ liệu danh sách ví'),
            new OA\Response(response: 401, description: 'Chưa xác thực')
        ]
    )]
    public function index(Request $request)
    {
        $accounts = $request->user()->accounts()->get();
        return AccountResource::collection($accounts);
    }

    #[OA\Post(
        path: '/accounts',
        summary: 'Tạo tài khoản/ví mới',
        tags: ['Ví & Tài khoản'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Ví Tiền mặt'),
                    new OA\Property(property: 'icon', type: 'string', example: 'Wallet'),
                    new OA\Property(property: 'balance', type: 'number', format: 'float', example: 1000000),
                    new OA\Property(property: 'is_default', type: 'boolean', example: false)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Đã tạo ví thành công'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ')
        ]
    )]
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string',
            'balance' => 'nullable|numeric',
            'is_default' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Nếu cái này là mặc định, reset các cái khác
        if ($request->is_default) {
            $request->user()->accounts()->update(['is_default' => false]);
        }

        $account = $request->user()->accounts()->create([
            'name' => $request->name,
            'icon' => $request->icon,
            'balance' => $request->balance ?? 0,
            'is_default' => $request->is_default ?? false,
        ]);

        return new AccountResource($account);
    }

    /**
     * Lấy thông tin chi tiết một ví.
     */
    public function show(Request $request, string $id)
    {
        $account = $request->user()->accounts()->findOrFail($id);
        return new AccountResource($account);
    }

    /**
     * Cập nhật thông tin ví.
     */
    public function update(Request $request, string $id)
    {
        $account = $request->user()->accounts()->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'icon' => 'nullable|string',
            'balance' => 'numeric',
            'is_default' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->is_default) {
            $request->user()->accounts()->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $account->update($request->only(['name', 'icon', 'balance', 'is_default']));

        return new AccountResource($account);
    }

    /**
     * Xóa ví.
     */
    public function destroy(Request $request, string $id)
    {
        $account = $request->user()->accounts()->findOrFail($id);
        
        // Không cho phép xóa hết ví nếu còn giao dịch? Hoặc cho xóa nhưng nhắc client
        $account->delete();

        return response()->json(['message' => 'Đã xóa tài khoản thành công.']);
    }
}
