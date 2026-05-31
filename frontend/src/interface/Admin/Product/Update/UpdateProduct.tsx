
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

import { brandService, BrandDto } from "@/services/brandService";
import { categoryService, CategoryDto } from "@/services/categoryService";
import { productService, DiscountType, ProductType, ProductDto, ProductColorUpsertRequest } from "@/services/productService";
import { useAppNotification } from "@/providers/AppNotificationProvider";

const API_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:8080";

function resolveImageUrl(input?: string | null | unknown): string | undefined {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return undefined;
  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_URL}${raw}`;
  return `${API_URL}/${raw}`;
}

function getProductPreviewImage(dto: ProductDto): string {
  // Try to get thumbnail first, then first image
  const thumbnailImage = dto.productImages?.find(img => img.isThumbnail)?.imageUrl;
  const firstImage = dto.productImages?.[0]?.imageUrl;
  return (
    dto.productMainImage ||
    thumbnailImage ||
    firstImage ||
    dto.productColors?.[0]?.images?.[0] ||
    ""
  );
}

type ImageItem =
  | { key: string; type: "existing"; url: string }
  | { key: string; type: "new"; previewUrl: string; file: File };

type ColorImageItem =
  | { key: string; type: "existing"; url: string }
  | { key: string; type: "new"; previewUrl: string; file: File };

type ColorItem = {
  key: string;
  productColorId?: number | null;
  colorName: string;
  quantity: number;
  variants: VariantInput[];
  images: ColorImageItem[];
};

type VariantInput = {
  key: string;
  variantId?: number | null;
  ramGb: number | "";
  storageGb: number | "";
  quantity: number | "";
  price: number | "";
};

type Option = {
  id: number;
  name: string;
};

function mapCategory(dto: CategoryDto): Option {
  return { id: dto.categoryId, name: dto.categoryName };
}

function mapBrand(dto: BrandDto): Option {
  return { id: dto.brandId, name: dto.brandName };
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("vi-VN");
}

function calcCurrentPrice(base: number, discountType: DiscountType | null, discountValue: number | null) {
  const baseNum = Number(base) || 0;
  if (!discountType || discountType === "NONE" || discountValue == null || !Number.isFinite(discountValue)) return baseNum;
  if (discountType === "AMOUNT") return Math.max(baseNum - discountValue, 0);
  return Math.max(baseNum - (baseNum * discountValue) / 100, 0);
}

function selectZeroOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  if (e.currentTarget.value === "0") {
    e.currentTarget.select();
  }
}

function normalizeSpecName(value: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createEmptyVariantInput(): VariantInput {
  return {
    key: `${Date.now()}-${Math.random()}`,
    variantId: null,
    ramGb: "",
    storageGb: "",
    quantity: "",
    price: "",
  };
}

function isCompleteVariantInput(v: VariantInput) {
  return v.ramGb !== "" && v.storageGb !== "" && v.quantity !== "" && v.price !== "";
}

function countCompleteVariants(variants: VariantInput[]) {
  return (variants || []).filter(isCompleteVariantInput).length;
}

function pruneIncompleteVariants(variants: VariantInput[]) {
  const next = (variants || []).filter(isCompleteVariantInput);
  return next.length ? next : [createEmptyVariantInput()];
}

function toVariantPayload(variants: VariantInput[], discountType: DiscountType | "", discountValue: number | "") {
  const dt = discountType === "" ? null : discountType;
  const dv = discountValue === "" ? null : Number(discountValue);

  return (variants || [])
    .filter(isCompleteVariantInput)
    .map((v) => {
      const original = Math.max(Number(v.price) || 0, 0);
      const final = calcCurrentPrice(original, dt, dv);

      return {
        variantId: v.variantId || null,
        ramGb: Number(v.ramGb),
        storageGb: Number(v.storageGb),
        quantity: Math.max(Number(v.quantity) || 0, 0),
        originalPrice: original,
        discountType: (dt || "NONE") as DiscountType,
        discountValue: dv == null ? 0 : dv,
        finalPrice: final,
      };
    });
}

function minVariantPrice(productColors: ColorItem[]) {
  const prices: number[] = [];
  for (const c of productColors) {
    for (const v of c.variants || []) {
      const p = Number(v.price);
      if (Number.isFinite(p) && p > 0) prices.push(p);
    }
  }
  if (prices.length === 0) return 0;
  return Math.min(...prices);
}

function sumVariantQuantity(variants: VariantInput[]) {
  return variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
}

function deriveVariantSpecValues(productColors: ColorItem[]): { ramSpecValue: string; storageSpecValue: string } {
  const ramSet = new Set<number>();
  const storageSet = new Set<number>();

  for (const c of productColors) {
    for (const v of toVariantPayload(c.variants || [], "", "")) {
      if (typeof v.ramGb === "number" && Number.isFinite(v.ramGb)) ramSet.add(v.ramGb);
      if (typeof v.storageGb === "number" && Number.isFinite(v.storageGb)) storageSet.add(v.storageGb);
    }
  }

  const ram = Array.from(ramSet).sort((a, b) => a - b).map(String).join(", ");
  const storage = Array.from(storageSet).sort((a, b) => a - b).map(String).join(", ");
  return { ramSpecValue: ram, storageSpecValue: storage };
}


function mapDtoToForm(dto: ProductDto) {
  const spec = (dto.productSpecs && dto.productSpecs.length > 0) ? dto.productSpecs[0] : null;
  return {
    name: dto.productName || "",
    slug: dto.slug || "",
    brandId: dto.brandId || "",
    categoryId: dto.categoryId || "",
    productType: (dto.productType || "NEW") as ProductType,
    basePrice: Number(dto.basePrice || 0),
    discountType: (dto.discountType || "") as DiscountType | "",
    discountValue: dto.discountValue == null ? "" : Number(dto.discountValue),
    imageUrl: getProductPreviewImage(dto),
    productImages: [],
    version: spec?.version || "VN",
    chip: spec?.chip || "",
    cameraFront: spec?.cameraFront || "",
    cameraRear: spec?.cameraRear || "",
    screen: spec?.screen || "",
    battery: spec?.battery || "",
    refreshRate: spec?.refreshRate || "",
    fastCharge: spec?.fastCharge || "",
    support5g: spec?.support5g || false,
    nfc: spec?.nfc || false,
    operatingSystem: spec?.operatingSystem || "",
    size: spec?.size || "",
    weight: spec?.weight || "",
    material: spec?.material || "",
    waterResistance: spec?.waterResistance || "",
    chargingPort: spec?.chargingPort || "",
    sim: spec?.sim || "",
    warranty: spec?.warranty || "",
    productColors: (dto.productColors || []).map((c) => {
      const key = String(c.productColorId || `${Date.now()}-${Math.random()}`);
      return {
        key,
        productColorId: c.productColorId,
        colorName: c.colorName || "",
        quantity: Number(c.quantity) || 0,
        variants: (c.variants || []).map((v) => ({
          key: `${Date.now()}-${Math.random()}`,
          variantId: v.variantId ?? null,
          ramGb: (v.ramGb ?? "") as number | "",
          storageGb: (v.storageGb ?? "") as number | "",
          quantity: Number(v.quantity) || 0,
          price: (Number(v.originalPrice) || 0) as number | "",
        })),
        images: (c.images || []).map((u) => ({ key: u, type: "existing", url: u } as const)),
      };
    }),
    description: dto.productDescribe || "",

  };
}

export default function UpdateProduct() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const productId = Number(id);

  const [reveal, setReveal] = React.useState(false);

  const [brands, setBrands] = React.useState<Option[]>([]);
  const [categories, setCategories] = React.useState<Option[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [brandId, setBrandId] = React.useState<number | "">("");
  const [categoryId, setCategoryId] = React.useState<number | "">("");
  const [productType, setProductType] = React.useState<ProductType>("NEW");
  const [basePrice, setBasePrice] = React.useState<number>(0);
  const [discountType, setDiscountType] = React.useState<DiscountType | "">("");
  const [discountValue, setDiscountValue] = React.useState<number | "">("");

  // Product spec fields
  const [version, setVersion] = React.useState("VN");
  const [chip, setChip] = React.useState("");
  const [cameraFront, setCameraFront] = React.useState("");
  const [cameraRear, setCameraRear] = React.useState("");
  const [screen, setScreen] = React.useState("");
  const [battery, setBattery] = React.useState("");
  const [refreshRate, setRefreshRate] = React.useState("");
  const [fastCharge, setFastCharge] = React.useState("");
  const [support5g, setSupport5g] = React.useState(false);
  const [nfc, setNfc] = React.useState(false);
  const [operatingSystem, setOperatingSystem] = React.useState("");
  const [size, setSize] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [material, setMaterial] = React.useState("");
  const [waterResistance, setWaterResistance] = React.useState("");
  const [chargingPort, setChargingPort] = React.useState("");
  const [sim, setSim] = React.useState("");
  const [warranty, setWarranty] = React.useState("");

  const [imageUrl, setImageUrl] = React.useState("");
  const [thumbnailImage, setThumbnailImage] = React.useState<ImageItem | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDraggingProductImages, setIsDraggingProductImages] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [openDropdown, setOpenDropdown] = React.useState<null | "brand" | "category" | "productType" | "discountType" | "version">(null);
  const dropdownScopeRef = React.useRef<HTMLFormElement | null>(null);

  const [productColors, setProductColors] = React.useState<ColorItem[]>([]);
  const colorImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const [colorUploadTargetKey, setColorUploadTargetKey] = React.useState<string | null>(null);

  const [draftColorName, setDraftColorName] = React.useState("");
  const [draftVariants, setDraftVariants] = React.useState<VariantInput[]>([createEmptyVariantInput()]);
  const [draftColorQuantity, setDraftColorQuantity] = React.useState<number>(0);
  const [draftColorImages, setDraftColorImages] = React.useState<ColorImageItem[]>([]);
  const draftColorImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const [description, setDescription] = React.useState("");
  const [descriptionModalOpen, setDescriptionModalOpen] = React.useState(false);
  const descriptionModalRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [variantsModalOpen, setVariantsModalOpen] = React.useState(false);
  const [variantsModalColorKey, setVariantsModalColorKey] = React.useState<string | null>(null);
  const [variantsModalMode, setVariantsModalMode] = React.useState<"draft" | "color">("draft");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [validationModal, setValidationModal] = React.useState<{ open: boolean; fields: string[] }>({ open: false, fields: [] });
  const [submitted, setSubmitted] = React.useState(false);
  const { showToast } = useAppNotification();
  const isVariantCategory = React.useMemo(() => {
    const id = categoryId === "" ? null : Number(categoryId);
    if (!id) return false;

    const name = (categories.find((c) => c.id === id)?.name || "").trim().toLowerCase();
    const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // bỏ dấu
    return normalized.includes("dien thoai") || normalized === "phone" || normalized.includes("smartphone");
  }, [categoryId, categories]);

  React.useEffect(() => {
    if (!descriptionModalOpen) return;
    const t = window.setTimeout(() => {
      descriptionModalRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [descriptionModalOpen]);

  React.useEffect(() => {
    if (!descriptionModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDescriptionModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [descriptionModalOpen]);

  React.useEffect(() => {
    if (!variantsModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVariantsModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variantsModalOpen]);

  function openDraftVariantsModal() {
    setVariantsModalMode("draft");
    setVariantsModalColorKey(null);
    setVariantsModalOpen(true);
  }

  function openColorVariantsModal(colorKey: string) {
    setVariantsModalMode("color");
    setVariantsModalColorKey(colorKey);
    setVariantsModalOpen(true);
  }

  function closeVariantsModal() {
    if (variantsModalMode === "draft") {
      setDraftVariants((prev) => pruneIncompleteVariants(prev));
      setVariantsModalOpen(false);
      return;
    }

    const colorKey = variantsModalColorKey;
    if (colorKey) {
      setProductColors((prev) =>
        prev.map((c) => {
          if (c.key !== colorKey) return c;
          const nextVariants = pruneIncompleteVariants(c.variants);
          return { ...c, variants: nextVariants, quantity: sumVariantQuantity(nextVariants) };
        })
      );
    }
    setVariantsModalOpen(false);
  }

  React.useEffect(() => {
    if (!openDropdown) return;
    const onMouseDown = (e: MouseEvent) => {
      const scope = dropdownScopeRef.current;
      if (!scope) return;
      if (e.target instanceof Node && scope.contains(e.target)) return;
      setOpenDropdown(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [openDropdown]);

  function addProductImageFiles(files: File[]) {
    const accepted = files.filter((f) => f.type.startsWith("image/"));
    if (accepted.length === 0) return;
    // Only keep the first image (thumbnail)
    const file = accepted[0];
    if (thumbnailImage) {
      try {
        if (thumbnailImage.type === "new") {
          URL.revokeObjectURL(thumbnailImage.previewUrl);
        }
      } catch {
        // ignore
      }
    }
    setThumbnailImage({
      key: `${Date.now()}-${Math.random()}`,
      type: "new",
      previewUrl: URL.createObjectURL(file),
      file,
    });

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handlePickColorImages(colorKey: string) {
    const c = productColors.find((x) => x.key === colorKey);
    const colorName = c?.colorName?.trim() || "";
    if (!colorName) {
      setError("Vui lòng nhập Tên màu trước khi chọn ảnh cho màu đó.");
      return;
    }
    setError(null);
    setColorUploadTargetKey(colorKey);
    colorImageInputRef.current?.click();
  }

  function removeDraftColorImage(imageKey: string) {
    setDraftColorImages((prev) => {
      const removed = prev.find((i) => i.key === imageKey);
      if (removed && removed.type === "new") {
        try {
          URL.revokeObjectURL(removed.previewUrl);
        } catch {
          // ignore
        }
      }
      return prev.filter((i) => i.key !== imageKey);
    });
  }

  function saveDraftColor() {
    const name = draftColorName.trim();
    if (!name) {
      setError("Vui lòng nhập Tên màu trước khi lưu.");
      return;
    }
    if (draftColorImages.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ảnh cho màu này trước khi lưu.");
      return;
    }

    setError(null);
    const key = `${Date.now()}-${Math.random()}`;
    const totalQty = sumVariantQuantity(draftVariants);
    setProductColors((prev) => [
      ...prev,
      {
        key,
        productColorId: null,
        colorName: name,
        quantity: totalQty,
        variants: draftVariants,
        images: draftColorImages,
      },
    ]);
    setDraftColorName("");
    setDraftVariants([createEmptyVariantInput()]);
    setDraftColorImages([]);
    if (draftColorImageInputRef.current) {
      draftColorImageInputRef.current.value = "";
    }
  }

  React.useEffect(() => {
    (async () => {
      if (!id || Number.isNaN(productId)) {
        setError("Thiếu id sản phẩm.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [dto, b, c] = await Promise.all([productService.getById(productId), brandService.getAll(), categoryService.getAll()]);

        setBrands(b.map(mapBrand));
        setCategories(c.map(mapCategory));

        const form = mapDtoToForm(dto);
        setName(form.name);
        setSlug(form.slug);
        setBrandId(form.brandId === "" ? "" : Number(form.brandId));
        setCategoryId(form.categoryId === "" ? "" : Number(form.categoryId));
        setProductType(form.productType);
        setBasePrice(form.basePrice);
        setDiscountType(form.discountType);
        setDiscountValue(form.discountValue === "" ? "" : Number(form.discountValue));
        setImageUrl(form.imageUrl);
        if (form.imageUrl) {
          setThumbnailImage({ key: form.imageUrl, type: "existing", url: form.imageUrl });
        }
        setProductColors(form.productColors);
        setDescription(form.description);
        setVersion(form.version || "VN");
        setChip(form.chip);
        setCameraFront(form.cameraFront);
        setCameraRear(form.cameraRear);
        setScreen(form.screen);
        setBattery(form.battery);
        setRefreshRate(form.refreshRate);
        setFastCharge(form.fastCharge);
        setSupport5g(form.support5g);
        setNfc(form.nfc);
        setOperatingSystem(form.operatingSystem);
        setSize(form.size);
        setWeight(form.weight);
        setMaterial(form.material);
        setWaterResistance(form.waterResistance);
        setChargingPort(form.chargingPort);
        setSim(form.sim);
        setWarranty(form.warranty);
      } catch (e: any) {
        setError(e?.message || "Không tìm thấy sản phẩm. Vui lòng quay lại danh sách.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, productId]);

  const currentPrice = React.useMemo(
    () => calcCurrentPrice(basePrice, discountType || null, discountValue === "" ? null : discountValue),
    [basePrice, discountType, discountValue]
  );

  const primaryPreviewUrl = React.useMemo(() => {
    if (!thumbnailImage) return imageUrl || undefined;
    if (thumbnailImage.type === "existing") return resolveImageUrl(thumbnailImage.url);
    return thumbnailImage.previewUrl;
  }, [thumbnailImage, imageUrl]);

  function removeImage() {
    if (thumbnailImage) {
      try {
        if (thumbnailImage.type === "new") {
          URL.revokeObjectURL(thumbnailImage.previewUrl);
        }
      } catch {
        // ignore
      }
    }
    setThumbnailImage(null);
  }

  function addColor() {
    setProductColors((prev) => {
      const nextKey = `${Date.now()}-${Math.random()}`;
      return [...prev, { key: nextKey, productColorId: null, colorName: "", quantity: 0, variants: [createEmptyVariantInput()], images: [] }];
    });
  }

  function removeColor(key: string) {
    setProductColors((prev) => {
      const removed = prev.find((c) => c.key === key);
      if (removed) {
        for (const img of removed.images) {
          if (img.type === "new") {
            try {
              URL.revokeObjectURL(img.previewUrl);
            } catch {
              // ignore
            }
          }
        }
      }
      return prev.filter((c) => c.key !== key);
    });
  }

  function removeColorImage(colorKey: string, imageKey: string) {
    const color = productColors.find((c) => c.key === colorKey);
    const image = color?.images.find((i) => i.key === imageKey);

    // If it's a new image, revoke object URL
    if (image && image.type === "new") {
      try {
        URL.revokeObjectURL(image.previewUrl);
      } catch {
        // ignore
      }
    }

    setProductColors((prev) => {
      return prev.map((c) => {
        if (c.key !== colorKey) return c;
        return { ...c, images: c.images.filter((i) => i.key !== imageKey) };
      });
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const n = name.trim();
    const s = slug.trim();
    const derivedBasePrice = minVariantPrice(productColors);
    const missingFields: string[] = [];

    if (!n) missingFields.push("Tên sản phẩm");
    if (!s) missingFields.push("Slug (URL)");
    if (!brandId) missingFields.push("Thương hiệu");
    if (!categoryId) missingFields.push("Danh mục");
    if (discountType === "" || (discountType !== "NONE" && (discountValue === "" || discountValue == null))) {
      missingFields.push("Giá giảm");
    }
    if (!chip && !screen && !battery && !cameraFront && !cameraRear) {
      missingFields.push("Thông số kỹ thuật");
    }
    if (!thumbnailImage) missingFields.push("Ảnh đại diện");

    if (productColors.length === 0) {
      missingFields.push("Thêm màu nhanh");
    } else {
      const validColors = productColors.filter(c => c.colorName.trim() && c.images.length > 0);
      if (validColors.length === 0) {
        missingFields.push("Thêm màu nhanh");
      } else {
        const hasValidQuantity = validColors.some(c => {
          if (c.variants && c.variants.length > 0) {
            const totalVariantQty = c.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
            return totalVariantQty > 0;
          }
          return (c.quantity || 0) > 0;
        });
        if (!hasValidQuantity) {
          missingFields.push("Thêm màu nhanh");
        }
      }
    }

    if (!description.trim()) missingFields.push("Mô tả");

    if (missingFields.length > 0) {
      setValidationModal({ open: true, fields: missingFields });
      return;
    }

    setError(null);
    setSubmitting(true);

    window.setTimeout(async () => {
      try {
        setUploading(true);

        let productMainImage = imageUrl || null;
        if (thumbnailImage && thumbnailImage.type === "new") {
          const uploaded = await productService.uploadProductImage(thumbnailImage.file);
          productMainImage = uploaded.url;
        } else if (thumbnailImage && thumbnailImage.type === "existing") {
          productMainImage = thumbnailImage.url;
        }

        const payloadColors: ProductColorUpsertRequest[] = [];
        for (const c of productColors) {
          const colorName = c.colorName.trim();
          if (!colorName) continue;

          const uploadedNewUrls = new Map<string, string>();
          for (const img of c.images) {
            if (img.type === "new") {
              const uploaded = await productService.uploadProductImage(img.file);
              uploadedNewUrls.set(img.key, uploaded.url);
            }
          }

          const images = c.images
            .map((img) => {
              if (img.type === "existing") return img.url;
              return uploadedNewUrls.get(img.key) || "";
            })
            .filter((u) => !!u);

          payloadColors.push({
            productColorId: c.productColorId || null,
            colorName,
            colorCode: null,
            quantity: sumVariantQuantity(c.variants),
            images,
            variants: toVariantPayload(c.variants, discountType, discountValue),
          });
        }

        await productService.update(productId, {
          productName: n,
          slug: s,
          productMainImage,
          productImages: productMainImage ? [productMainImage] : [],
          productColors: payloadColors,
          productSpec: {
            version: version || null,
            chip: chip || null,
            cameraFront: cameraFront || null,
            cameraRear: cameraRear || null,
            screen: screen || null,
            battery: battery || null,
            refreshRate: refreshRate || null,
            fastCharge: fastCharge || null,
            support5g: support5g,
            nfc: nfc,
            operatingSystem: operatingSystem || null,
            size: size || null,
            weight: weight || null,
            material: material || null,
            waterResistance: waterResistance || null,
            chargingPort: chargingPort || null,
            sim: sim || null,
            warranty: warranty || null,
          },
          categoryId: Number(categoryId),
          brandId: brandId === "" ? null : Number(brandId),
          productType,
          productDescribe: description.trim() || null,
        });

        router.push("/products");
      } catch (e: any) {
        setError(e?.message || "Không thể cập nhật sản phẩm.");
      } finally {
        setUploading(false);
        setSubmitting(false);
      }
    }, 220);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_18px_rgba(232,121,249,0.55)]" />
            Cập nhật sản phẩm
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Cập nhật sản phẩm</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Cập nhật thông tin sản phẩm.</p>
        </div>

      </div>

      <div className="fixed top-[115px] right-[46px] z-50 flex items-center gap-3">
        <Link
          href="/products"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Quay lại
        </Link>
        <button
          type="submit"
          form="product-form"
          disabled={submitting || uploading}
          className={
            "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 " +
            (submitting || uploading ? "opacity-70 pointer-events-none" : "")
          }
        >
          {submitting || uploading ? (
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v4h8" />
            </svg>
          )}
          Lưu
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <form
          id="product-form"
          onSubmit={onSubmit}
          ref={(node) => {
            dropdownScopeRef.current = node;
          }}
          className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thông tin sản phẩm</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Vui lòng nhập đầy đủ thông tin.</div>
          </div>

          <div className="space-y-4 p-5">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tên sản phẩm</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhập tên sản phẩm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Slug (URL)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhập slug sản phẩm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thương hiệu</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((v) => (v === "brand" ? null : "brand"))}
                    className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                  >
                    <span className="truncate">
                      {brandId === "" ? "Chọn thương hiệu" : brands.find((b) => b.id === brandId)?.name || "Chọn thương hiệu"}
                    </span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {openDropdown === "brand" ? (
                    <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                      <div className="max-h-56 overflow-auto p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBrandId("");
                            setOpenDropdown(null);
                          }}
                          className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          Chọn thương hiệu
                        </button>
                        {brands.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setBrandId(b.id);
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (brandId === b.id ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Danh mục</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((v) => (v === "category" ? null : "category"))}
                    className="flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                  >
                    <span className="truncate">
                      {categoryId === "" ? "Chọn danh mục" : categories.find((c) => c.id === categoryId)?.name || "Chọn danh mục"}
                    </span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {openDropdown === "category" ? (
                    <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                      <div className="max-h-56 overflow-auto p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryId("");
                            setOpenDropdown(null);
                          }}
                          className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          Chọn danh mục
                        </button>
                        {categories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCategoryId(c.id);
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (categoryId === c.id ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Loại sản phẩm</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((v) => (v === "productType" ? null : "productType"))}
                    className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                  >
                    <span className="truncate">
                      {productType === "NEW"
                        ? "Sản phẩm mới"
                        : productType === "BEST_SELLER"
                          ? "Sản phẩm bán chạy"
                          : "Sản phẩm giảm giá"}
                    </span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {openDropdown === "productType" ? (
                    <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                      <div className="max-h-56 overflow-auto p-1">
                        {([
                          { value: "NEW" as const, label: "Sản phẩm mới" },
                          { value: "BEST_SELLER" as const, label: "Sản phẩm bán chạy" },
                          { value: "SALE" as const, label: "Sản phẩm giảm giá" },
                        ] as const).map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                              setProductType(o.value);
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (productType === o.value
                                ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                                : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Loại giảm giá</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((v) => (v === "discountType" ? null : "discountType"))}
                    className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                  >
                    <span className="truncate">
                      {discountType === ""
                        ? "Không giảm giá"
                        : discountType === "AMOUNT"
                          ? "Giảm theo số tiền"
                          : "Giảm theo %"}
                    </span>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {openDropdown === "discountType" ? (
                    <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                      <div className="max-h-56 overflow-auto p-1">
                        {([
                          { value: "" as const, label: "Không giảm giá" },
                          { value: "AMOUNT" as const, label: "Giảm theo số tiền" },
                          { value: "PERCENT" as const, label: "Giảm theo %" },
                        ] as const).map((o) => (
                          <button
                            key={o.label}
                            type="button"
                            onClick={() => {
                              setDiscountType(o.value);
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (discountType === o.value
                                ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100"
                                : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Giá giảm</label>
                <input
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                  onFocus={selectZeroOnFocus}
                  disabled={discountType === ""}
                  className="h-11 w-full rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                  placeholder={discountType === "PERCENT" ? "Nhập số % giảm" : "Nhập số tiền giảm"}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thông số kỹ thuật</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phiên bản</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((v) => (v === "version" ? null : "version"))}
                      className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl bg-slate-100 px-3 text-left text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    >
                      <span className="truncate">
                        {version === "VN"
                          ? "VN (Việt Nam)"
                          : version === "US"
                            ? "US (Mỹ)"
                            : version === "JP"
                              ? "JP (Nhật Bản)"
                              : version === "KR"
                                ? "KR (Hàn Quốc)"
                                : version === "EU"
                                  ? "EU (Châu Âu)"
                                  : version === "CN"
                                    ? "CN (Trung Quốc)"
                                    : version === "GLOBAL"
                                      ? "GLOBAL (Toàn cầu)"
                                      : "Chọn phiên bản"}
                      </span>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>

                    {openDropdown === "version" ? (
                      <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg animate-popover dark:border-white/10 dark:bg-slate-950">
                        <div className="max-h-56 overflow-auto p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setVersion("VN");
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (version === "VN" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            VN (Việt Nam)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVersion("US");
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (version === "US" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            US (Mỹ)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVersion("JP");
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (version === "JP" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            JP (Nhật Bản)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVersion("KR");
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (version === "KR" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            KR (Hàn Quốc)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVersion("EU");
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (version === "EU" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            EU (Châu Âu)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVersion("CN");
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (version === "CN" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            CN (Trung Quốc)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setVersion("GLOBAL");
                              setOpenDropdown(null);
                            }}
                            className={
                              "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10 " +
                              (version === "GLOBAL" ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" : "text-slate-700 dark:text-slate-200")
                            }
                          >
                            GLOBAL (Toàn cầu)
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Chip</label>
                  <input
                    type="text"
                    value={chip}
                    onChange={(e) => setChip(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập tên chip"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Camera trước</label>
                  <input
                    type="text"
                    value={cameraFront}
                    onChange={(e) => setCameraFront(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập camera trước"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Camera sau</label>
                  <input
                    type="text"
                    value={cameraRear}
                    onChange={(e) => setCameraRear(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập camera sau"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Màn hình</label>
                  <input
                    type="text"
                    value={screen}
                    onChange={(e) => setScreen(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập màn hình"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Pin</label>
                  <input
                    type="text"
                    value={battery}
                    onChange={(e) => setBattery(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập pin"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Tần số quét</label>
                  <input
                    type="text"
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập tần số quét"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Sạc nhanh</label>
                  <input
                    type="text"
                    value={fastCharge}
                    onChange={(e) => setFastCharge(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập sạc nhanh"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Hệ điều hành</label>
                  <input
                    type="text"
                    value={operatingSystem}
                    onChange={(e) => setOperatingSystem(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập hệ điều hành"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Kích thước</label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập kích thước"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Trọng lượng</label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập trọng lượng"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Chất liệu</label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập chất liệu"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Chống nước</label>
                  <input
                    type="text"
                    value={waterResistance}
                    onChange={(e) => setWaterResistance(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập chống nước"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Cổng sạc</label>
                  <input
                    type="text"
                    value={chargingPort}
                    onChange={(e) => setChargingPort(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập cổng sạc"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">SIM</label>
                  <input
                    type="text"
                    value={sim}
                    onChange={(e) => setSim(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập SIM"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bảo hành</label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30  dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập bảo hành"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Hỗ trợ 5G</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={support5g}
                      onChange={(e) => setSupport5g(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{support5g ? "Có hỗ trợ 5G" : "Không hỗ trợ 5G"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">NFC</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={nfc}
                      onChange={(e) => setNfc(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{nfc ? "Có hỗ trợ NFC" : "Không hỗ trợ NFC"}</span>
                  </div>
                </div>
              </div>
            </div>


            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ảnh đại diện</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  addProductImageFiles(files);
                }}
                className="hidden"
              />

              <div
                role="button"
                tabIndex={0}
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    imageInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  if (loading) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingProductImages(true);
                }}
                onDragOver={(e) => {
                  if (loading) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingProductImages(true);
                }}
                onDragLeave={(e) => {
                  if (loading) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingProductImages(false);
                }}
                onDrop={(e) => {
                  if (loading) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingProductImages(false);
                  const files = Array.from(e.dataTransfer.files || []);
                  if (files.length === 0) return;
                  addProductImageFiles(files);
                }}
                className={
                  "group relative overflow-hidden rounded-3xl border border-dashed cursor-pointer p-4 transition " +
                  (loading
                    ? "border-slate-200 bg-white opacity-70 dark:border-white/10 dark:bg-white/5"
                    : isDraggingProductImages
                      ? "border-emerald-400 bg-emerald-50 shadow-sm dark:border-emerald-400/50 dark:bg-emerald-500/10"
                      : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10")
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition " +
                      (loading
                        ? "bg-slate-900/70 text-white ring-slate-900/10 dark:bg-white/10 dark:ring-white/10"
                        : isDraggingProductImages
                          ? "bg-emerald-600 text-white ring-emerald-600/20"
                          : "bg-slate-900/90 text-white ring-slate-900/10 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10")
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v10" />
                      <path d="M8 7l4-4 4 4" />
                      <path d="M20 21H4a2 2 0 0 1-2-2v-5" />
                      <path d="M22 14v5a2 2 0 0 1-2 2" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {thumbnailImage ? "Đã chọn ảnh đại diện" : "Tải ảnh đại diện lên"}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Kéo-thả ảnh vào đây hoặc bấm để chọn (chỉ 1 ảnh)</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      imageInputRef.current?.click();
                    }}
                    className="inline-flex cursor-pointer h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0  dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    Chọn ảnh
                  </button>
                </div>
              </div>

              {thumbnailImage ? (
                <div className="pt-2">
                  <div
                    className="group relative aspect-[9/16] w-32 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10"
                  >
                    <Image
                      src={thumbnailImage.type === "existing" ? (resolveImageUrl(thumbnailImage.url) || "https://dummyimage.com/200x200/e2e8f0/64748b&text=No+Image") : thumbnailImage.previewUrl}
                      alt="product-thumbnail"
                      width={200}
                      height={200}
                      unoptimized
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-110 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage()}
                      className="absolute right-2 top-2 cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm transition hover:bg-rose-500"
                      title="Xóa ảnh"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-2 left-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Ảnh đại diện
                    </div>
                  </div>
                </div>
              ) : null}

              {variantsModalOpen ? (
                <div
                  className="fixed inset-0 z-[90]"
                  role="dialog"
                  aria-modal="true"
                  onClick={closeVariantsModal}
                >
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in-up" />

                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div
                      className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 animate-auth-page"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nhập biến thể</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">RAM / Bộ nhớ / Số lượng / Giá</div>
                        </div>

                        <button
                          type="button"
                          onClick={closeVariantsModal}
                          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          Đóng
                        </button>
                      </div>

                      <div className="p-5">
                        <div className="grid grid-cols-4 gap-3 pb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <div>RAM (GB)</div>
                          <div>Bộ nhớ (GB)</div>
                          <div>Số lượng</div>
                          <div>Giá</div>
                        </div>

                        {(variantsModalMode === "draft" ? draftVariants : (productColors.find((x) => x.key === variantsModalColorKey)?.variants || [])).map((v) => {
                          const updateVariant = (patch: Partial<typeof v>) => {
                            if (variantsModalMode === "draft") {
                              setDraftVariants((prev) => prev.map((x) => (x.key === v.key ? { ...x, ...patch } : x)));
                              return;
                            }
                            const colorKey = variantsModalColorKey;
                            if (!colorKey) return;
                            setProductColors((prev) =>
                              prev.map((c) => {
                                if (c.key !== colorKey) return c;
                                const nextVariants = c.variants.map((z) => (z.key === v.key ? { ...z, ...patch } : z));
                                return { ...c, variants: nextVariants, quantity: sumVariantQuantity(nextVariants) };
                              })
                            );
                          };

                          const removeVariant = () => {
                            if (variantsModalMode === "draft") {
                              setDraftVariants((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.key !== v.key)));
                              return;
                            }
                            const colorKey = variantsModalColorKey;
                            if (!colorKey) return;
                            setProductColors((prev) =>
                              prev.map((c) => {
                                if (c.key !== colorKey) return c;
                                const nextVariants = c.variants.length <= 1 ? c.variants : c.variants.filter((x) => x.key !== v.key);
                                return { ...c, variants: nextVariants, quantity: sumVariantQuantity(nextVariants) };
                              })
                            );
                          };

                          return (
                            <div key={v.key} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-center">
                              <input
                                type="number"
                                min={0}
                                value={v.ramGb}
                                onChange={(e) => updateVariant({ ramGb: e.target.value === "" ? "" : Number(e.target.value) })}
                                className="h-11 rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                                placeholder="RAM (GB)"
                              />
                              <input
                                type="number"
                                min={0}
                                value={v.storageGb}
                                onChange={(e) => updateVariant({ storageGb: e.target.value === "" ? "" : Number(e.target.value) })}
                                className="h-11 rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                                placeholder="Bộ nhớ (GB)"
                              />
                              <input
                                type="number"
                                min={0}
                                value={v.quantity}
                                onChange={(e) => updateVariant({ quantity: e.target.value === "" ? "" : Number(e.target.value) })}
                                className="h-11 rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                                placeholder="Số lượng"
                              />
                              <input
                                type="number"
                                min={0}
                                value={v.price}
                                onChange={(e) => updateVariant({ price: e.target.value === "" ? "" : Number(e.target.value) })}
                                className="h-11 rounded-2xl bg-slate-100 px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                                placeholder="Giá"
                              />
                              <button
                                type="button"
                                onClick={removeVariant}
                                className="h-11 rounded-2xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500 transition cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            if (variantsModalMode === "draft") {
                              setDraftVariants((prev) => [...prev, createEmptyVariantInput()]);
                              return;
                            }
                            const colorKey = variantsModalColorKey;
                            if (!colorKey) return;
                            setProductColors((prev) =>
                              prev.map((c) => (c.key === colorKey ? { ...c, variants: [...c.variants, createEmptyVariantInput()] } : c))
                            );
                          }}
                          className="mt-4 h-10 w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          + Thêm loại
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Thêm màu nhanh
              </div>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tên màu</label>
                  <input
                    value={draftColorName}
                    onChange={(e) => setDraftColorName(e.target.value)}
                    className="h-11 w-full rounded-2xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                    placeholder="Nhập màu sản phẩm"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!draftColorName.trim()) {
                          setError("Vui lòng nhập Tên màu trước khi chọn ảnh.");
                          return;
                        }
                        setError(null);
                        draftColorImageInputRef.current?.click();
                      }}
                      className="inline-flex cursor-pointer h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {draftColorImages.length > 0 ? "Sửa ảnh" : "Chọn ảnh"}
                    </button>
                    <button
                      type="button"
                      onClick={saveDraftColor}
                      className="inline-flex cursor-pointer h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0"
                    >
                      Lưu màu
                    </button>
                  </div>
                  {/* Image preview or status - now in left column */}
                  {draftColorImages.length > 0 ? (
                    <div className="pt-2">
                      {draftColorImages.slice(0, 1).map((img, idx) => {
                        const src = img.type === "existing" ? img.url : img.previewUrl;
                        return (
                          <div key={img.key} className="group relative aspect-9/16 w-32 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                            <Image
                              src={img.type === "existing" ? (resolveImageUrl(src) || "https://dummyimage.com/200x356/e2e8f0/64748b&text=No+Image") : src}
                              alt={`draft-color-${idx}`}
                              width={200}
                              height={356}
                              unoptimized
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-110 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => removeDraftColorImage(img.key)}
                              className="absolute right-2 top-2 cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm transition hover:bg-rose-500"
                              title="Xóa ảnh"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18" />
                                <path d="M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pt-1 text-sm text-slate-600 dark:text-slate-300">Chưa chọn ảnh.</div>
                  )}
                </div>

                {/* Right column: Biến thể */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Biến thể (RAM/Bộ nhớ/Số lượng/Giá)
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-700 dark:text-slate-200">
                        {countCompleteVariants(draftVariants)} loại - Tổng SL: {sumVariantQuantity(draftVariants)}
                      </div>
                      <button
                        type="button"
                        onClick={openDraftVariantsModal}
                        className="inline-flex cursor-pointer h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        Nhập biến thể
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <input
                ref={draftColorImageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  // Replace with single image (remove old, add new)
                  const file = files[0];
                  setDraftColorImages([
                    {
                      key: `${Date.now()}-${Math.random()}`,
                      type: "new",
                      previewUrl: URL.createObjectURL(file),
                      file: file,
                    }
                  ]);
                  if (draftColorImageInputRef.current) {
                    draftColorImageInputRef.current.value = "";
                  }
                }}
                className="hidden"
              />

              <input
                ref={colorImageInputRef}
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const targetKey = colorUploadTargetKey;
                  const files = Array.from(e.target.files || []);
                  if (!targetKey || files.length === 0) return;

                  const file = files[0];

                  // Find the color and its current image
                  const color = productColors.find((c) => c.key === targetKey);
                  const oldImage = color?.images[0];

                  // Delete old image from server if it's an existing image
                  if (oldImage && oldImage.type === "existing") {
                    try {
                      await productService.deleteProductImage(oldImage.url);
                    } catch (e: any) {
                      console.error("Failed to delete old image from server:", e);
                      // Continue even if delete fails
                    }
                  }

                  setProductColors((prev) => {
                    return prev.map((c) => {
                      if (c.key !== targetKey) return c;
                      // Replace with single new image
                      return {
                        ...c,
                        images: [{
                          key: `${Date.now()}-${Math.random()}`,
                          type: "new",
                          previewUrl: URL.createObjectURL(file),
                          file: file,
                        }]
                      };
                    });
                  });

                  if (colorImageInputRef.current) {
                    colorImageInputRef.current.value = "";
                  }
                  setColorUploadTargetKey(null);
                }}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ảnh theo màu</label>

              {productColors.length ? (
                <div className="grid gap-3">
                  {productColors.map((c) => (
                    <div key={c.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 sm:grid-cols-[280px_1fr] sm:items-start">
                      {/* Left column: Image + Name + SL */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tên màu</label>
                        <input
                          value={c.colorName}
                          onChange={(e) =>
                            setProductColors((prev) => prev.map((x) => (x.key === c.key ? { ...x, colorName: e.target.value } : x)))
                          }
                          className="h-11 w-full rounded-2xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                          placeholder="Nhập màu sản phẩm"
                        />

                        {/* Image with name and SL below */}
                        {c.images.length > 0 ? (
                          <div className="pt-1">
                            {c.images.slice(0, 1).map((img, idx) => {
                              const src = img.type === "existing" ? img.url : img.previewUrl;
                              return (
                                <div key={`${c.key}-${img.key}`} className="mx-auto w-32 space-y-1">
                                  <div className="group relative aspect-[9/16] w-32 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                                    <Image
                                      src={img.type === "existing" ? (resolveImageUrl(src) || "https://dummyimage.com/144x256/e2e8f0/64748b&text=No+Image") : src}
                                      alt={`color-${c.key}-${idx}`}
                                      width={144}
                                      height={256}
                                      unoptimized
                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-110 cursor-pointer"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeColorImage(c.key, img.key)}
                                      className="absolute right-2 top-2 cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm transition hover:bg-rose-500"
                                      title="Xóa"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18" />
                                        <path d="M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    <span className="block truncate">{c.colorName?.trim() ? c.colorName.trim() : "(Chưa đặt tên màu)"}</span>
                                    <span className="mt-0.5 block text-[11px] font-medium text-slate-600 dark:text-slate-300">SL: {sumVariantQuantity(c.variants)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="pt-2 text-sm text-slate-600 dark:text-slate-300">Chưa có ảnh.</div>
                        )}

                        {/* Edit image button */}
                        <button
                          type="button"
                          onClick={() => handlePickColorImages(c.key)}
                          className="inline-flex cursor-pointer h-10 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          {c.images.length > 0 ? "Sửa ảnh" : "Thêm ảnh"}
                        </button>
                      </div>

                      {/* Right column: Variants section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Biến thể (RAM/Bộ nhớ/Số lượng/Giá)</label>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Tổng SL: {sumVariantQuantity(c.variants)}
                          </span>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm text-slate-700 dark:text-slate-200">
                              {countCompleteVariants(c.variants)} loại
                            </div>
                            <button
                              type="button"
                              onClick={() => openColorVariantsModal(c.key)}
                              className="inline-flex cursor-pointer h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                              Xem biến thể
                            </button>
                          </div>
                        </div>

                        {/* Delete color button */}
                        <button
                          type="button"
                          onClick={() => removeColor(c.key)}
                          className="inline-flex cursor-pointer h-10 w-full items-center justify-center rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-500 active:translate-y-0 dark:bg-rose-600 dark:hover:bg-rose-500"
                        >
                          Xóa màu
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-600 dark:text-slate-300">Chưa có ảnh theo màu.</div>
              )}

            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Mô tả</label>
              <textarea
                value={description}
                readOnly
                onClick={() => setDescriptionModalOpen(true)}
                className="min-h-[120px] w-full resize-none rounded-2xl bg-slate-100 px-3 py-2 text-sm cursor-pointer text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10 dark:focus:ring-cyan-400/25"
                placeholder="Nhấn để phóng to và nhập mô tả..."
              />
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Nhấn vào ô mô tả để mở cửa sổ nhập lớn.
              </div>
            </div>

            {descriptionModalOpen ? (
              <div
                className="fixed inset-0 z-[90]"
                role="dialog"
                aria-modal="true"
                onClick={() => setDescriptionModalOpen(false)}
              >
                <div className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in-up" />

                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div
                    className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 animate-auth-page"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nhập mô tả</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Không gian lớn để nhập nội dung bao quát hơn.</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDescriptionModalOpen(false)}
                        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        Đóng
                      </button>
                    </div>

                    <div className="p-5">
                      <textarea
                        ref={descriptionModalRef}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="min-h-[420px] w-full resize-none rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-cyan-400/30 dark:bg-white/5 dark:text-slate-100 dark:ring-white/10"
                        placeholder="Mô tả sản phẩm..."
                      />
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDescriptionModalOpen(false)}
                          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescriptionModalOpen(false)}
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

        </form>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950/60 dark:shadow-2xl dark:shadow-black/40 dark:ring-1 dark:ring-white/5 dark:backdrop-blur dark:hover:shadow-black/40">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/60">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Xem trước</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Card sản phẩm hiển thị ở danh sách.</div>
            </div>
            <div className="p-5">
              <div className="group rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 transition hover:-translate-y-1 hover:bg-slate-100 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:ring-cyan-400/15">
                <div className="flex items-start gap-3">
                  <div className="h-24 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    <Image
                      alt="preview"
                      src={
                        resolveImageUrl(primaryPreviewUrl) || "https://dummyimage.com/144x256/e2e8f0/64748b&text=Product"
                      }
                      width={56}
                      height={96}
                      unoptimized
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-110 cursor-pointer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100 wrap-break-word">
                      {name.trim() || "Tên sản phẩm"}
                    </div>
                    <div className="mt-1 line-clamp-3 text-sm text-slate-700 dark:text-slate-300">
                      {description.trim() || "Mô tả sẽ hiển thị ở đây."}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                Tip: Có thể chọn giảm giá theo % hoặc số tiền.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {/* Validation Modal */}
      {validationModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in" onClick={() => setValidationModal({ ...validationModal, open: false })} />
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-in dark:border-white/10 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Bạn chưa điền đầy đủ thông tin sản phẩm</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Vui lòng kiểm tra lại và điền đầy đủ các thông tin bắt buộc.</p>
              <button
                type="button"
                onClick={() => setValidationModal({ ...validationModal, open: false })}
                className="mt-6 w-full cursor-pointer rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

