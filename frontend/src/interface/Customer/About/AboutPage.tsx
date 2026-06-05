"use client";

import { motion } from "framer-motion";
import { 
  Award, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Heart,
  Shield,
  Zap,
  Star,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Clock
} from "lucide-react";
import Image from "next/image";
import SocialQrContact from "@/components/customers/SocialQrContact";

const stats = [
  { icon: Users, label: "Khách hàng tin tưởng", value: "50,000+", color: "from-blue-500 to-cyan-500" },
  { icon: ShoppingBag, label: "Sản phẩm đa dạng", value: "10,000+", color: "from-purple-500 to-pink-500" },
  { icon: Award, label: "Năm kinh nghiệm", value: "10+", color: "from-amber-500 to-orange-500" },
  { icon: TrendingUp, label: "Tăng trưởng hàng năm", value: "150%", color: "from-emerald-500 to-teal-500" },
];

const features = [
  {
    icon: Shield,
    title: "Bảo hành chính hãng",
    description: "Cam kết 100% sản phẩm chính hãng với chế độ bảo hành toàn diện từ nhà sản xuất.",
    gradient: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  {
    icon: Zap,
    title: "Giao hàng siêu tốc",
    description: "Giao hàng nhanh chóng trong 2 giờ nội thành, miễn phí ship toàn quốc.",
    gradient: "from-purple-500/10 to-pink-500/10",
    iconColor: "text-purple-600 dark:text-purple-400"
  },
  {
    icon: Heart,
    title: "Hỗ trợ tận tâm",
    description: "Đội ngũ tư vấn chuyên nghiệp, nhiệt tình hỗ trợ 24/7 mọi lúc mọi nơi.",
    gradient: "from-rose-500/10 to-pink-500/10",
    iconColor: "text-rose-600 dark:text-rose-400"
  },
  {
    icon: Star,
    title: "Giá cả cạnh tranh",
    description: "Cam kết giá tốt nhất thị trường với nhiều chương trình ưu đãi hấp dẫn.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
];

const timeline = [
  { year: "2014", title: "Khởi đầu", description: "MyPhone Store được thành lập với sứ mệnh mang công nghệ đến gần hơn với mọi người." },
  { year: "2017", title: "Mở rộng", description: "Khai trương 10 chi nhánh trên toàn quốc, phục vụ hàng nghìn khách hàng mỗi ngày." },
  { year: "2020", title: "Chuyển đổi số", description: "Ra mắt nền tảng thương mại điện tử hiện đại, mua sắm online dễ dàng hơn bao giờ hết." },
  { year: "2024", title: "Dẫn đầu", description: "Trở thành một trong những chuỗi bán lẻ điện thoại uy tín nhất Việt Nam." },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as any
    }
  }
};

export default function AboutPage() {
  return (
    <div className="min-h-screen pb-12 sm:pb-20">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative mb-12 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 shadow-2xl sm:mb-20 sm:p-16 overflow-visible"
      >
        {/* Animated background blobs */}
        <div className="absolute -right-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 animate-pulse rounded-full bg-pink-500/20 blur-3xl" style={{ animationDelay: "1s" }} />
        
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white backdrop-blur-md"
          >
            <Heart className="h-4 w-4" />
            Về chúng tôi
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-6 text-4xl font-black leading-tight text-white sm:text-6xl lg:text-7xl"
          >
            MyPhone Store
            <br />
            <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">
              Đồng hành cùng bạn
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mx-auto max-w-2xl text-lg leading-relaxed text-indigo-100 sm:text-xl"
          >
            Hơn 10 năm kinh nghiệm trong lĩnh vực bán lẻ điện thoại và phụ kiện công nghệ, 
            chúng tôi tự hào là đối tác tin cậy của hàng chục nghìn khách hàng trên toàn quốc.
          </motion.p>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ margin: "-100px" }}
        className="mb-16 grid gap-6 px-2 sm:mb-24 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ scale: 1.05, y: -5 }}
            className="group relative overflow-hidden rounded-3xl bg-zinc-800/55 p-8 shadow-none transition-all duration-500"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 transition-opacity duration-500 group-hover:opacity-10`} />
            
            <div className="relative z-10">
              <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                <stat.icon className="h-7 w-7 text-white" />
              </div>
              
              <div className="mb-2 text-4xl font-black text-white sm:text-5xl">
                {stat.value}
              </div>
              
              <div className="text-sm font-bold uppercase tracking-wider text-slate-400">
                {stat.label}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="mb-16 sm:mb-24"
      >
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-black text-white sm:text-5xl">
            Tại sao chọn <span className="text-purple-600">MyPhone Store</span>?
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Chúng tôi cam kết mang đến trải nghiệm mua sắm tuyệt vời nhất với những giá trị cốt lõi
          </p>
        </div>

        <div className="grid gap-6 px-2 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ margin: "-100px" }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-3xl bg-zinc-800/55 p-8 shadow-none transition-all duration-500"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
              
              <div className="relative z-10">
                <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-white/10`}>
                  <feature.icon className={`h-8 w-8 ${feature.iconColor} transition-transform duration-500 group-hover:rotate-12`} />
                </div>
                
                <h3 className="mb-3 text-xl font-black text-white">
                  {feature.title}
                </h3>
                
                <p className="text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Timeline Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="mb-16 sm:mb-24"
      >
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-black text-white sm:text-5xl">
            Hành trình <span className="text-purple-600">Phát triển</span>
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Từ những ngày đầu khởi nghiệp đến vị thế hàng đầu như ngày hôm nay
          </p>
        </div>

        <div className="relative">
          <div className="space-y-8 sm:space-y-10">
            {timeline.map((item, index) => {
              return (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: "-100px" }}
                transition={{ delay: index * 0.12, duration: 0.55 }}
                className="relative overflow-hidden rounded-[2rem] bg-zinc-800/55 p-6 shadow-none sm:p-8"
              >
                <div className="flex items-start gap-4 sm:gap-5">
                  <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-base font-black text-white shadow-lg sm:h-16 sm:w-16 sm:text-lg">
                    {item.year}
                  </div>

                  <motion.div
                    whileHover={{ y: -3 }}
                    className="min-w-0 flex-1"
                  >
                    <h3 className="mb-2 text-2xl font-black text-white">
                      {item.title}
                    </h3>
                    <p className="max-w-3xl text-slate-400">
                      {item.description}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="mb-16 sm:mb-24">
        <div className="mx-auto max-w-6xl rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-8 shadow-2xl sm:p-12 lg:p-14">
          <SocialQrContact title="Liên hệ nhanh qua mạng xã hội" />
        </div>
      </div>

      {/* Contact CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="relative rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-8 shadow-2xl sm:p-16 overflow-visible"
      >
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-black text-white sm:text-5xl">
            Sẵn sàng trải nghiệm?
          </h2>
          <p className="mb-8 text-lg text-slate-300">
            Ghé thăm cửa hàng hoặc liên hệ với chúng tôi để được tư vấn miễn phí
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                <Phone className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-slate-400">Hotline</div>
              <div className="text-lg font-black text-white">0978 603 382</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                <Mail className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-slate-400">Email</div>
              <div className="text-sm font-black text-white">buivanha22032004@gmail.com</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-slate-400">Địa chỉ</div>
              <div className="text-sm font-black text-white text-center">Hà Nội, Việt Nam</div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
