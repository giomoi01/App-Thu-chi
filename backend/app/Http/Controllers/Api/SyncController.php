<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Models\Account;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class SyncController extends Controller
{
    #[OA\Post(
        path: '/sync/push',
        summary: 'Đồng bộ dữ liệu từ Client lên Server',
        tags: ['Đồng bộ (Sync)'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'accounts', type: 'array', items: new OA\Items(type: 'object')),
                    new OA\Property(property: 'categories', type: 'array', items: new OA\Items(type: 'object')),
                    new OA\Property(property: 'transactions', type: 'array', items: new OA\Items(type: 'object'))
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đồng bộ thành công')
        ]
    )]
    public function push(Request $request)
    {
        $data = $request->validate([
            'transactions' => 'array',
            'accounts' => 'array',
            'categories' => 'array',
        ]);

        return DB::transaction(function () use ($request, $data) {
            $user = $request->user();

            // 1. Đồng bộ Accounts trước
            if (isset($data['accounts'])) {
                foreach ($data['accounts'] as $acc) {
                    Account::updateOrCreate(
                        ['user_id' => $user->id, 'name' => $acc['name']],
                        ['icon' => $acc['icon'] ?? null, 'balance' => $acc['balance'] ?? 0]
                    );
                }
            }

            // 2. Đồng bộ Categories
            if (isset($data['categories'])) {
                foreach ($data['categories'] as $cat) {
                    Category::updateOrCreate(
                        ['user_id' => $user->id, 'name' => $cat['name']],
                        ['type' => $cat['type'], 'icon' => $cat['icon'] ?? null]
                    );
                }
            }

            // 3. Đồng bộ Transactions (Xử lý đơn giản: chỉ thêm nếu chưa có)
            if (isset($data['transactions'])) {
                foreach ($data['transactions'] as $trans) {
                    // Cần logic check trùng nâng cao hơn, hiện tại tạm thời add mới
                    $user->transactions()->create($trans);
                }
            }

            return response()->json(['success' => true, 'message' => 'Đồng bộ dữ liệu thành công.']);
        });
    }

    #[OA\Get(
        path: '/sync/pull',
        summary: 'Lấy toàn bộ dữ liệu từ Server về Client',
        tags: ['Đồng bộ (Sync)'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Dữ liệu toàn bộ các bảng')
        ]
    )]
    public function pull(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'accounts' => $user->accounts,
            'categories' => $user->categories,
            'transactions' => TransactionResource::collection($user->transactions()->latest()->take(100)->get()),
            'budgets' => $user->budgets,
            'goals' => $user->goals,
        ]);
    }
}
