import React from 'react';
import { 
  ShoppingCart, Utensils, Receipt, Home, Car, HeartPulse, MoreHorizontal, 
  Gift, Gamepad2, Shirt, Sparkles, PartyPopper, Plane, HeartHandshake, 
  Shield, BookOpen, GraduationCap, Laptop, Users, TrendingUp, 
  ArrowDownRight, Banknote, Award, Store, Wallet, Landmark, Smartphone,
  CreditCard, PiggyBank, Coins, Coffee, Pizza, Bus, Bike, Briefcase,
  Camera, Music, Tv, Book, PenTool, Scissors, Dumbbell, Stethoscope,
  Baby, Dog, Cat, TreePine, Cloud, Sun, Moon, Star, Heart, Film, ShoppingBag
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart size={20} />,
  Utensils: <Utensils size={20} />,
  Receipt: <Receipt size={20} />,
  Home: <Home size={20} />,
  Car: <Car size={20} />,
  HeartPulse: <HeartPulse size={20} />,
  MoreHorizontal: <MoreHorizontal size={20} />,
  Gift: <Gift size={20} />,
  Gamepad2: <Gamepad2 size={20} />,
  Shirt: <Shirt size={20} />,
  Sparkles: <Sparkles size={20} />,
  PartyPopper: <PartyPopper size={20} />,
  Plane: <Plane size={20} />,
  HeartHandshake: <HeartHandshake size={20} />,
  Shield: <Shield size={20} />,
  BookOpen: <BookOpen size={20} />,
  GraduationCap: <GraduationCap size={20} />,
  Laptop: <Laptop size={20} />,
  Users: <Users size={20} />,
  TrendingUp: <TrendingUp size={20} />,
  ArrowDownRight: <ArrowDownRight size={20} />,
  Banknote: <Banknote size={20} />,
  Award: <Award size={20} />,
  Store: <Store size={20} />,
  Coffee: <Coffee size={20} />,
  Pizza: <Pizza size={20} />,
  Bus: <Bus size={20} />,
  Bike: <Bike size={20} />,
  Briefcase: <Briefcase size={20} />,
  Camera: <Camera size={20} />,
  Music: <Music size={20} />,
  Tv: <Tv size={20} />,
  Book: <Book size={20} />,
  PenTool: <PenTool size={20} />,
  Scissors: <Scissors size={20} />,
  Dumbbell: <Dumbbell size={20} />,
  Stethoscope: <Stethoscope size={20} />,
  Baby: <Baby size={20} />,
  Dog: <Dog size={20} />,
  Cat: <Cat size={20} />,
  TreePine: <TreePine size={20} />,
  Cloud: <Cloud size={20} />,
  Sun: <Sun size={20} />,
  Moon: <Moon size={20} />,
  Star: <Star size={20} />,
  Heart: <Heart size={20} />,
  Film: <Film size={20} />,
  ShoppingBag: <ShoppingBag size={20} />,
  Wallet: <Wallet size={20} />
};

export const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  Wallet: <Wallet size={24} />,
  Landmark: <Landmark size={24} />,
  Smartphone: <Smartphone size={24} />,
  CreditCard: <CreditCard size={24} />,
  PiggyBank: <PiggyBank size={24} />,
  Coins: <Coins size={24} />,
  MoreHorizontal: <MoreHorizontal size={24} />,
  TrendingUp: <TrendingUp size={24} />
};

export const getCategoryIcon = (iconName: string | null) => {
  return CATEGORY_ICONS[iconName || 'MoreHorizontal'] || CATEGORY_ICONS['MoreHorizontal'];
};

export const getAccountIcon = (iconName: string | null) => {
  return ACCOUNT_ICONS[iconName || 'Wallet'] || ACCOUNT_ICONS['Wallet'];
};
