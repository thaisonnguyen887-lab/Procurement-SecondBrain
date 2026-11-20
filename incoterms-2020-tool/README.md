# Quy trình Incoterms 2020 (3D tương tác)

Trang web tĩnh một file, mô phỏng 3D quy trình giao hàng, điểm chuyển rủi ro (đường hồng), chi phí và chứng từ của **11 điều kiện Incoterms 2020**: EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF.

Mở trực tiếp từng điều kiện bằng hash: `/#exw`, `/#fob`, `/#cif`...

## Cấu trúc
| Đường dẫn | Mô tả |
|---|---|
| `index.html` | Bản triển khai (đã nén, three.js r128 và font nạp từ CDN). Đây là file được deploy |
| `offline/Incoterms_2020_Quy_trinh.offline.html` | Bản chạy độc lập, nhúng sẵn three.js, dùng khi không có mạng (font fallback) |
| `source/incoterms.readable.html` | Bản gốc dễ đọc, dùng để chỉnh sửa |
| `source/terms.js`, `exw_steps.js`, `rows.json` | Dữ liệu nguồn: điều kiện, 7 bước, khuyến nghị |
| `vercel.json` | Cấu hình Vercel (static, security headers) |

## Chạy thử cục bộ
```bash
python3 -m http.server 8080   # rồi mở http://localhost:8080
```

## Deploy
- **Vercel:** Import repo, Framework Preset = *Other*, không cần Build Command, Output Directory để trống (thư mục gốc).
- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root.
- **Cloudflare Pages / Netlify:** thư mục publish = `/`, không build.

## Chỉnh sửa
Sửa `source/incoterms.readable.html`. Hiện `index.html` là bản nén của file này; nếu sửa nội dung, cần xuất lại `index.html` (có thể nhờ Claude Code minify rồi ghi đè).

## Nguồn và lưu ý
Nội dung dựa trên ICC *Incoterms® 2020*. Công cụ chỉ mang tính đào tạo; hợp đồng thực tế cần đối chiếu bản ICC chính thức và tư vấn pháp lý. Incoterms® là nhãn hiệu của ICC.
