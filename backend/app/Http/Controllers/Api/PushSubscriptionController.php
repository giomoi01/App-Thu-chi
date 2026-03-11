<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class PushSubscriptionController extends Controller
{
    #[OA\Post(
        path: '/push-subscriptions',
        summary: 'Đăng ký nhận thông báo đẩy',
        tags: ['Thông báo (Push)'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'subscription_json', type: 'string', example: '{"endpoint":"...","keys":{...}}')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Đã đăng ký thành công')
        ]
    )]
    public function store(Request $request)
    {
        $request->validate([
            'subscription_json' => 'required|string',
        ]);

        $subscription = PushSubscription::updateOrCreate(
            ['user_id' => $request->user()->id],
            ['subscription_json' => $request->subscription_json]
        );

        return response()->json(['success' => true]);
    }

    #[OA\Delete(
        path: '/push-subscriptions',
        summary: 'Hủy đăng ký nhận thông báo đẩy',
        tags: ['Thông báo (Push)'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Đã hủy đăng ký')
        ]
    )]
    public function destroy(Request $request)
    {
        $request->user()->pushSubscriptions()->delete();
        return response()->json(['success' => true]);
    }
}
