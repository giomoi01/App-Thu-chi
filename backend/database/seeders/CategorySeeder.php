<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            // Chi phí (Expense)
            ['name' => 'Ăn uống', 'type' => 'expense', 'icon' => 'Utensils', 'is_default' => true],
            ['name' => 'Di chuyển', 'type' => 'expense', 'icon' => 'Car', 'is_default' => true],
            ['name' => 'Mua sắm', 'type' => 'expense', 'icon' => 'ShoppingBag', 'is_default' => true],
            ['name' => 'Nhà cửa', 'type' => 'expense', 'icon' => 'Home', 'is_default' => true],
            ['name' => 'Giải trí', 'type' => 'expense', 'icon' => 'Gamepad', 'is_default' => true],
            ['name' => 'Sức khỏe', 'type' => 'expense', 'icon' => 'HeartPulse', 'is_default' => true],
            ['name' => 'Giáo dục', 'type' => 'expense', 'icon' => 'GraduationCap', 'is_default' => true],
            
            // Thu nhập (Income)
            ['name' => 'Lương', 'type' => 'income', 'icon' => 'Wallet', 'is_default' => true],
            ['name' => 'Thưởng', 'type' => 'income', 'icon' => 'Trophy', 'is_default' => true],
            ['name' => 'Đầu tư', 'type' => 'income', 'icon' => 'TrendingUp', 'is_default' => true],
            ['name' => 'Kinh doanh', 'type' => 'income', 'icon' => 'Briefcase', 'is_default' => true],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                ['name' => $category['name'], 'type' => $category['type']],
                $category
            );
        }
    }
}
