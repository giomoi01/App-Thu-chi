<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class TransactionController extends Controller
{
    /**
     * Danh sách giao dịch.
     */
    #[OA\Get(
        path: '/transactions',
        summary: 'Lấy lịch sử giao dịch',
        tags: ['Giao dịch'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Danh sách giao dịch')
        ]
    )]
    public function index(Request $request)
    {
        $transactions = $request->user()->transactions()
            ->with(['category', 'account'])
            ->latest('date')
            ->paginate($request->get('limit', 20));

        return TransactionResource::collection($transactions);
    }

    /**
     * Tạo giao dịch mới và cập nhật số dư ví.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|string|in:income,expense',
            'amount' => 'required|numeric|min:0',
            'category_id' => 'required|exists:categories,id',
            'date' => 'required|date',
            'account_id' => 'required|exists:accounts,id',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            $account = $request->user()->accounts()->findOrFail($request->account_id);

            // Tạo giao dịch
            $transaction = $request->user()->transactions()->create([
                'type' => $request->type,
                'amount' => $request->amount,
                'category_id' => $request->category_id,
                'date' => $request->date,
                'account_id' => $request->account_id,
                'note' => $request->note,
            ]);

            // Cập nhật số dư
            if ($request->type === 'income') {
                $account->increment('balance', $request->amount);
            } else {
                $account->decrement('balance', $request->amount);
            }

            return new TransactionResource($transaction);
        });
    }

    /**
     * Xem một giao dịch.
     */
    public function show(Request $request, string $id)
    {
        $transaction = $request->user()->transactions()->with(['category', 'account'])->findOrFail($id);
        return new TransactionResource($transaction);
    }

    /**
     * Xóa giao dịch và hoàn lại số dư ví.
     */
    public function destroy(Request $request, string $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);

        DB::transaction(function () use ($transaction) {
            $account = $transaction->account;

            // Hoàn lại tiền vào ví
            if ($transaction->type === 'income') {
                $account->decrement('balance', $transaction->amount);
            } else {
                $account->increment('balance', $transaction->amount);
            }

            $transaction->delete();
        });

        return response()->json(['message' => 'Đã xóa giao dịch và cập nhật số dư ví.']);
    }
}
