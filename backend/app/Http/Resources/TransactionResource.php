<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'amount' => (float) $this->amount,
            'category_id' => $this->category_id,
            'category_name' => $this->category->name ?? null,
            'date' => $this->date->format('Y-m-d'),
            'note' => $this->note,
            'account_id' => $this->account_id,
            'account_name' => $this->account->name ?? null,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
