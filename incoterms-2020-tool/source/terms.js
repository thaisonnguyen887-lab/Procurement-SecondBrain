/* ---------- Incoterms 2020: dữ liệu 11 điều kiện ---------- */
var ORDER=["EXW","FCA","CPT","CIP","DAP","DPU","DDP","FAS","FOB","CFR","CIF"];
var GROUPS=[{t:"Mọi phương thức vận tải",c:["EXW","FCA","CPT","CIP","DAP","DPU","DDP"]},{t:"Đường biển & thủy nội địa",c:["FAS","FOB","CFR","CIF"]}];
var H="hi",M="mid",L="lo";
var LV={hi:"Cao",mid:"Trung bình",lo:"Thấp"};
/* flags:
   pre  = ai thuê/trả chặng nội địa nước XK; main = ai ký hợp đồng & trả cước chính; exp/imp = ai thông quan XK/NK
   ins  = bảo hiểm người bán bắt buộc mua (A/C) hoặc null; dlv = cách giao; xp = vị trí chuyển rủi ro (đơn vị bước, 0..7) */
var TERMS={
 EXW:{en:"Ex Works",vn:"giao tại xưởng",pre:"B",main:"B",exp:"B",imp:"B",ins:null,dlv:"exw",xp:2,rate:[H,M,M],
  lead:"Người bán chỉ đặt hàng dưới quyền định đoạt của người mua tại xưởng. Từ bốc hàng, thông quan, vận chuyển đến bảo hiểm đều do người mua lo.",
  where:"Tại xưởng người bán, hàng chưa bốc lên xe"},
 FCA:{en:"Free Carrier",vn:"giao cho người chuyên chở",pre:"B",main:"B",exp:"S",imp:"B",ins:null,dlv:"fca",xp:2,rate:[M,M,M],
  lead:"Người bán làm thủ tục xuất khẩu và giao hàng cho người chuyên chở do người mua chỉ định. Ví dụ ở đây: giao tại cơ sở người bán, người bán bốc hàng lên xe của người mua.",
  where:"Khi người bán bốc xong hàng lên xe do người mua chỉ định tại cơ sở người bán"},
 CPT:{en:"Carriage Paid To",vn:"cước phí trả tới",pre:"S",main:"S",exp:"S",imp:"B",ins:null,dlv:"carrier",xp:2,rate:[H,H,H],
  lead:"Người bán thuê và trả cước tới nơi đến quy định, nhưng rủi ro chuyển sang người mua ngay khi giao hàng cho người chuyên chở đầu tiên. Ví dụ ở đây: nơi đến là cảng đến.",
  where:"Khi giao hàng cho người chuyên chở đầu tiên (tại nơi đi)"},
 CIP:{en:"Carriage and Insurance Paid To",vn:"cước phí và bảo hiểm trả tới",pre:"S",main:"S",exp:"S",imp:"B",ins:"A",dlv:"carrier",xp:2,rate:[H,H,L],
  lead:"Như CPT, cộng thêm nghĩa vụ người bán mua bảo hiểm hàng hóa tối thiểu ICC (A), 110% giá trị. Rủi ro vẫn chuyển sang người mua tại nơi đi. Ví dụ ở đây: nơi đến là cảng đến.",
  where:"Khi giao hàng cho người chuyên chở đầu tiên (tại nơi đi)"},
 DAP:{en:"Delivered at Place",vn:"giao tại nơi đến",pre:"S",main:"S",exp:"S",imp:"B",ins:null,dlv:"dap",xp:6.82,rate:[L,L,L],
  lead:"Người bán chịu chi phí và rủi ro đưa hàng tới nơi đến quy định, hàng còn trên phương tiện, sẵn sàng để dỡ. Người mua dỡ hàng và làm thủ tục nhập khẩu. Ví dụ ở đây: nơi đến là kho người mua.",
  where:"Tại kho người mua, hàng còn trên xe, sẵn sàng để dỡ"},
 DPU:{en:"Delivered at Place Unloaded",vn:"giao tại nơi đến đã dỡ hàng",pre:"S",main:"S",exp:"S",imp:"B",ins:null,dlv:"dpu",xp:7,rate:[L,L,L],
  lead:"Như DAP, nhưng người bán phải dỡ hàng xuống tại nơi đến. Đây là điều kiện duy nhất buộc người bán dỡ hàng. Người mua vẫn làm thủ tục nhập khẩu. Ví dụ ở đây: nơi đến là kho người mua.",
  where:"Tại kho người mua, sau khi người bán đã dỡ hàng xuống"},
 DDP:{en:"Delivered Duty Paid",vn:"giao hàng đã nộp thuế",pre:"S",main:"S",exp:"S",imp:"S",ins:null,dlv:"ddp",xp:6.82,rate:[L,L,L],
  lead:"Người bán chịu mọi chi phí và rủi ro tới nơi đến, kể cả thủ tục nhập khẩu, thuế nhập khẩu và VAT. Người mua chỉ dỡ hàng và nhận hàng. Ví dụ ở đây: nơi đến là kho người mua.",
  where:"Tại kho người mua, hàng đã thông quan nhập khẩu, còn trên xe, sẵn sàng để dỡ"},
 FAS:{en:"Free Alongside Ship",vn:"giao dọc mạn tàu",pre:"S",main:"B",exp:"S",imp:"B",ins:null,dlv:"fas",xp:3.62,rate:[M,M,M],
  lead:"Người bán làm thủ tục xuất khẩu và đặt hàng dọc mạn con tàu do người mua chỉ định tại cảng bốc. Việc xếp hàng lên tàu và mọi chặng sau do người mua lo.",
  where:"Khi hàng được đặt dọc mạn tàu tại cảng bốc"},
 FOB:{en:"Free On Board",vn:"giao lên tàu",pre:"S",main:"B",exp:"S",imp:"B",ins:null,dlv:"fob",xp:3.88,rate:[M,M,M],
  lead:"Người bán làm thủ tục xuất khẩu và xếp hàng lên con tàu do người mua chỉ định tại cảng bốc. Rủi ro chuyển khi hàng đã nằm trên tàu; cước biển và bảo hiểm do người mua lo.",
  where:"Khi hàng đã xếp lên tàu tại cảng bốc"},
 CFR:{en:"Cost and Freight",vn:"tiền hàng và cước phí",pre:"S",main:"S",exp:"S",imp:"B",ins:null,dlv:"cfr",xp:3.88,rate:[H,H,H],
  lead:"Người bán thuê tàu, trả cước tới cảng đến, nhưng rủi ro chuyển sang người mua khi hàng đã xếp lên tàu tại cảng bốc. Người bán không có nghĩa vụ mua bảo hiểm.",
  where:"Khi hàng đã xếp lên tàu tại cảng bốc"},
 CIF:{en:"Cost, Insurance and Freight",vn:"tiền hàng, bảo hiểm và cước phí",pre:"S",main:"S",exp:"S",imp:"B",ins:"C",dlv:"cif",xp:3.88,rate:[H,H,M],
  lead:"Như CFR, cộng thêm nghĩa vụ người bán mua bảo hiểm tối thiểu ICC (C), 110% giá trị. Rủi ro vẫn chuyển khi hàng đã xếp lên tàu tại cảng bốc.",
  where:"Khi hàng đã xếp lên tàu tại cảng bốc"}
};
var ADV={
EXW:"Chỉ nên chọn khi người mua có đại lý hoặc forwarder tại nước người bán và tự làm được thủ tục xuất khẩu, hoặc khi mua nội địa, hàng giá trị thấp. Với người bán nước ngoài chưa quen, nên chọn FCA thay thế vì người bán sẽ làm thủ tục xuất khẩu và bốc hàng lên xe.",
FCA:"Nên chọn khi muốn tự kiểm soát vận tải và cước, hàng đóng container hoặc đa phương thức, người bán đủ năng lực làm thủ tục xuất khẩu. Là lựa chọn tốt nhất trong nhóm F.",
FAS:"Chỉ chọn cho hàng rời hoặc hàng siêu trường giao tại cảng, khi người mua thuê tàu riêng. Hàng container không phù hợp.",
FOB:"Chọn khi có forwarder hoặc hãng tàu tốt, giá cước ưu đãi, hàng rời hoặc đường biển truyền thống và người bán đáng tin. Hàng container nên chuyển sang FCA.",
CPT:"Chọn khi muốn người bán lo vận tải (đa phương thức), người bán uy tín, hàng giá trị thấp đến trung bình và người mua chủ động mua bảo hiểm riêng. Cần giám định trước giao.",
CIP:"Nên chọn khi nhập hàng giá trị cao bằng container hoặc đa phương thức, từ người bán mới, hoặc muốn giá trọn gói đã có bảo hiểm ICC (A). Là lựa chọn tốt nhất trong nhóm C cho hàng container.",
CFR:"Chọn cho hàng rời đường biển khi người mua đã có hợp đồng bảo hiểm bao (open cover) và muốn tự mua bảo hiểm. Nhớ bảo hiểm từ lúc hàng lên tàu.",
CIF:"Chỉ chọn cho hàng rời đường biển khi người mua chưa có bảo hiểm hoặc L/C yêu cầu CIF, và đã thỏa thuận nâng lên ICC (A). Hàng container nên dùng CIP.",
DAP:"Nên chọn khi người mua ít kinh nghiệm vận tải quốc tế, muốn giá về tận nơi, nhưng vẫn tự làm nhập khẩu để kiểm soát thuế và thủ tục hải quan, và có sẵn thiết bị dỡ hàng.",
DPU:"Chọn khi nơi nhận không có thiết bị dỡ, hàng cồng kềnh hoặc cần người bán dỡ tại chỗ; người mua vẫn tự làm thủ tục nhập khẩu.",
DDP:"Chỉ chọn khi hàng nhỏ lẻ hoặc hàng mẫu, người mua không muốn làm thủ tục nhập khẩu và người bán có tư cách nhập khẩu tại nước đến. Tránh khi thuế, VAT khó kiểm soát hoặc cần chứng từ nhập khẩu đứng tên người mua."
};

/* ---------- chứng từ ---------- */
var DC={
 CI:["CI","Commercial Invoice","Hóa đơn thương mại"],
 PL:["PL","Packing List","Phiếu đóng gói"],
 COA:["COA","Certificate of Analysis / Quality (nếu hợp đồng yêu cầu)","Chứng nhận phân tích / chất lượng"],
 DR:["DR","Delivery Receipt","Biên bản giao nhận hàng"],
 IC:["IC","Inspection Certificate (nếu thuê giám định)","Chứng thư giám định"],
 FCR:["FCR","Forwarder's Cargo Receipt","Biên nhận hàng của forwarder"],
 TO:["TO","Transport Order","Lệnh điều xe / vận chuyển"],
 BKG:["BKG","Booking Confirmation","Xác nhận đặt chỗ"],
 EIR:["EIR","Equipment Interchange Receipt (hàng container)","Phiếu giao nhận container"],
 EXD:["EXD","Export Customs Declaration","Tờ khai hải quan xuất khẩu"],
 CO:["C/O","Certificate of Origin (nếu cần)","Giấy chứng nhận xuất xứ"],
 EL:["EL","Export Licence / Permit (nếu có)","Giấy phép xuất khẩu"],
 DOCK:["D/R","Dock Receipt","Biên nhận hàng tại cầu cảng"],
 MR:["M/R","Mate's Receipt","Biên lai thuyền phó (hàng đã lên tàu)"],
 BL:["B/L","Bill of Lading","Vận đơn đường biển"],
 BLOB:["B/L","Shipped on Board Bill of Lading","Vận đơn đã xếp hàng lên tàu"],
 SWB:["SWB","Sea Waybill (thay B/L nếu có)","Giấy gửi hàng đường biển"],
 MTD:["MTD","Multimodal Transport Document (nếu đa phương thức)","Chứng từ vận tải đa phương thức"],
 AWB:["AWB","Air Waybill (nếu đi đường hàng không)","Vận đơn hàng không"],
 INSB:["INS","Marine Insurance Certificate / Policy (người mua tự mua, nên ICC A)","Giấy chứng nhận / đơn bảo hiểm hàng hóa"],
 INSA:["INS","Insurance Certificate / Policy, ICC (A), tối thiểu 110%","Giấy chứng nhận / đơn bảo hiểm (người bán mua)"],
 INSC:["INS","Insurance Certificate / Policy, ICC (C), tối thiểu 110%","Giấy chứng nhận / đơn bảo hiểm (người bán mua)"],
 IMD:["IMD","Import Customs Declaration","Tờ khai hải quan nhập khẩu"],
 AN:["A/N","Arrival Notice","Thông báo hàng đến"],
 DO:["D/O","Delivery Order","Lệnh giao hàng"],
 SET:["CI · PL · B/L","Import document set (Invoice, Packing List, B/L)","Bộ chứng từ nhập khẩu"],
 TAX:["TAX","Import duty & VAT payment receipt","Chứng từ nộp thuế nhập khẩu, VAT"],
 DN:["DN","Delivery Note","Phiếu giao hàng"],
 GRN:["GRN","Goods Receipt Note","Phiếu / biên bản nhập kho"],
 PA:["PA","Payment Advice / T/T Remittance (hoặc L/C)","Chứng từ thanh toán / giấy báo chuyển tiền"],
 POD:["POD","Proof of Delivery","Biên bản xác nhận giao hàng tại nơi đến"]
};
function dc(){var a=[];for(var i=0;i<arguments.length;i++)a.push(DC[arguments[i]]);return a}

/* ---------- sinh 7 bước cho các điều kiện ngoài EXW ---------- */
function genSteps(code){
 var c=TERMS[code],F=(code==="FCA"||code==="FAS"||code==="FOB"),C=(code==="CPT"||code==="CIP"||code==="CFR"||code==="CIF"),
     D=(code==="DAP"||code==="DPU"||code==="DDP"),sea=(code==="FAS"||code==="FOB"||code==="CFR"||code==="CIF"),
     multi=!sea,st=[];
 var buyIns="Tự mua bảo hiểm hàng hóa, khuyến nghị ICC (A), tối thiểu 110% giá trị, hiệu lực từ điểm chuyển rủi ro";
 /* B1 */
 st.push({t:"Chuẩn bị hàng",place:"Xưởng người bán",
  s:"Kiểm tra, đóng gói, đánh dấu hàng; chuẩn bị chứng từ xuất khẩu",
  b:F?"Chỉ định người chuyên chở hoặc tàu, báo thời gian và địa điểm nhận hàng":C?"Xác nhận lịch giao hàng và nơi đến; chuẩn bị bảo hiểm nếu cần":(code==="DDP"?"Cung cấp thông tin để người bán làm thủ tục nhập khẩu":"Xác nhận địa điểm giao; chuẩn bị hồ sơ nhập khẩu"),
  docs:dc("CI","PL","COA"),
  cap:"Người bán kiểm tra chất lượng, đóng gói, đánh dấu hàng và chuẩn bị chứng từ. Chi phí các việc này do người bán chịu.",
  seller:["Kiểm tra, cân, đếm hàng cần thiết để giao","Đóng gói và đánh dấu hàng phù hợp với phương thức vận tải","Chuẩn bị hóa đơn thương mại và chứng từ hợp đồng yêu cầu; xin giấy phép xuất khẩu nếu có"],
  buyer:F?["Ký hợp đồng vận tải và báo cho người bán tên người chuyên chở hoặc tàu, thời gian và địa điểm nhận hàng","Cân nhắc cử giám định kiểm hàng trước khi giao"]
       :C?["Thống nhất cảng hoặc nơi đến quy định trong hợp đồng","Cân nhắc cử giám định trước giao vì rủi ro sẽ chuyển sớm ở nơi đi"]
       :(code==="DDP"?["Cung cấp mã số thuế, thông tin nhà nhập khẩu và giấy phép (nếu có) để người bán làm thủ tục nhập khẩu"]:["Xác nhận địa chỉ giao hàng và khả năng tiếp nhận (giờ nhận, lối xe vào)","Chuẩn bị hồ sơ nhập khẩu: mã HS, giấy phép, kiểm tra chuyên ngành nếu có"]),
  tip:F?"Ghi rõ quy cách đóng gói, ký mã hiệu và tiêu chuẩn kiểm tra. Người mua chỉ định vận tải nên cần báo lịch sớm để tránh phát sinh phí lưu kho tại người bán."
      :C?"Nhóm C: người bán chọn hãng vận tải. Nên quy định hãng tàu hoặc tiêu chuẩn hãng tàu, thời gian vận chuyển tối đa trong hợp đồng."
      :"Nhóm D: người bán chịu rủi ro tới nơi đến nên giá thường cao hơn. So sánh với FCA hoặc CIP cộng chi phí tự lo để đánh giá giá."});
 /* B2 */
 var b2={place:"Tại xưởng, lên xe"};
 if(code==="FCA"){b2.t="Bốc hàng lên xe người mua";b2.place="Điểm giao FCA (xưởng người bán)";
  b2.s="Bốc hàng lên phương tiện do người mua chỉ định";b2.b="Điều xe hoặc forwarder tới nhận hàng, kiểm đếm, ký nhận";
  b2.docs=dc("DR","FCR","IC");
  b2.cap="Người bán bốc hàng lên xe do người mua chỉ định tại cơ sở người bán. Đây là điểm giao FCA: rủi ro chuyển sang người mua khi bốc xong.";
  b2.seller=["Bốc hàng lên phương tiện của người chuyên chở do người mua chỉ định","Báo cho người mua hàng đã được giao"];
  b2.buyer=["Đưa phương tiện tới đúng thời gian, địa điểm đã báo","Kiểm đếm, ký biên bản giao nhận; chịu rủi ro từ lúc hàng bốc xong"];
  b2.tip="Ghi rõ địa điểm giao trong hợp đồng (ví dụ: FCA kho người bán, địa chỉ cụ thể). Nếu L/C cần vận đơn đã xếp hàng, thỏa thuận theo điều khoản mới của FCA 2020 để người mua yêu cầu người chuyên chở cấp B/L on board cho người bán.";}
 else if(code==="CPT"||code==="CIP"){b2.t="Giao cho người chuyên chở đầu tiên";b2.place="Điểm giao (xưởng người bán)";
  b2.s="Ký hợp đồng vận tải tới nơi đến, giao hàng cho người chuyên chở đầu tiên";b2.b="Nhận thông báo giao hàng, theo dõi lô hàng";
  b2.docs=dc("BKG","DR","IC");
  b2.cap="Người bán giao hàng cho người chuyên chở đầu tiên do mình thuê. Rủi ro chuyển sang người mua ngay tại đây, dù cước tới nơi đến vẫn do người bán trả.";
  b2.seller=["Ký hợp đồng vận tải từ nơi giao tới nơi đến quy định","Giao hàng cho người chuyên chở đầu tiên, báo cho người mua"].concat(code==="CIP"?["Mua bảo hiểm ICC (A), tối thiểu 110% giá trị, hiệu lực từ điểm giao"]:[]);
  b2.buyer=["Nhận thông báo giao hàng và theo dõi lô hàng","Chịu rủi ro mất mát, hư hỏng kể từ lúc này"];
  b2.tip=code==="CIP"?"Rủi ro đã thuộc người mua từ đây. Kiểm tra giấy chứng nhận bảo hiểm người bán mua: ICC (A), 110%, người mua được bồi thường, hiệu lực từ điểm giao.":"Điểm dễ hiểu nhầm của nhóm C: người bán trả cước nhưng rủi ro đã thuộc người mua từ nơi đi. Người mua phải tự mua bảo hiểm có hiệu lực từ thời điểm này.";}
 else{b2.t="Bốc hàng lên xe";b2.place="Tại xưởng, trên xe người bán";
  b2.s="Bốc hàng lên xe của mình hoặc xe do mình thuê";b2.b=null;
  b2.docs=dc("TO","BKG","IC");
  b2.cap="Người bán bốc hàng lên xe của mình hoặc xe do mình thuê. Rủi ro và chi phí vẫn thuộc người bán.";
  b2.seller=["Bốc hàng lên phương tiện, chịu chi phí bốc hàng","Đặt chỗ vận chuyển"+(sea&&code!=="CFR"&&code!=="CIF"?" ra cảng":" theo lịch tàu")];
  b2.buyer=["Không có nghĩa vụ ở bước này"].concat(code==="FAS"||code==="FOB"?["Đã báo tên tàu, thời gian và vị trí xếp hàng cho người bán"]:[]);
  b2.tip="Có thể cử giám định kiểm hàng khi bốc tại xưởng. Chi phí giám định trước giao thường do người mua chịu nếu là yêu cầu riêng của người mua.";}
 st.push(b2);
 /* B3 */
 var pS=c.pre==="S";
 st.push({t:"Vận chuyển ra cảng đi",place:"Trên xe tải",
  s:code==="FCA"?null:(code==="CPT"||code==="CIP")?"Trả cước chặng nội địa (nằm trong cước tới nơi đến)":"Chở hàng ra cảng đi, trả cước nội địa",
  b:code==="FCA"?"Xe của người mua chở hàng ra cảng hoặc bãi container, trả cước":(code==="CPT"||code==="CIP")?"Chịu rủi ro hàng trên đường, theo dõi lô hàng":null,
  docs:dc("TO","EIR"),
  cap:code==="FCA"?"Xe do người mua thuê chở hàng ra cảng đi. Rủi ro và chi phí chặng này thuộc người mua.":(code==="CPT"||code==="CIP")?"Người chuyên chở của người bán chở hàng ra cảng đi. Cước do người bán trả, nhưng rủi ro thuộc người mua.":"Người bán chở hàng ra cảng đi. Chi phí và rủi ro chặng này vẫn thuộc người bán.",
  seller:code==="FCA"?["Không có nghĩa vụ vận chuyển sau khi đã giao hàng"]:["Trả cước vận chuyển nội địa ra cảng đi"],
  buyer:code==="FCA"?["Trả cước nội địa, chịu rủi ro trên đường","Hạ container, giao hàng cho hãng tàu theo booking của mình"]:(code==="CPT"||code==="CIP")?["Chịu rủi ro hàng trên đường dù không trả cước","Theo dõi lô hàng qua người chuyên chở"]:["Không có nghĩa vụ ở bước này"],
  tip:code==="FCA"?"Chọn forwarder có bảo hiểm trách nhiệm. Bảo hiểm hàng hóa cần có hiệu lực từ cơ sở người bán.":(code==="CPT"||code==="CIP")?"Hư hỏng trên chặng này là rủi ro của người mua; người mua khiếu nại người chuyên chở hoặc bảo hiểm, không đòi được người bán nếu hàng đã giao đúng.":"Người mua chưa chịu rủi ro. Theo dõi lịch tàu và cut-off để tránh trễ chuyến."});
 /* B4 */
 var b4={t:"Thông quan XK & xếp tàu",place:"Cảng đi",docs:dc("EXD","CO","EL")};
 if(code==="FCA"){b4.s="Làm thủ tục, nộp phí xuất khẩu (hoàn tất khi giao hàng)";b4.b="Forwarder hạ bãi, xếp hàng lên tàu, trả phí xếp dỡ tại cảng đi";
  b4.cap="Người bán chịu trách nhiệm thông quan xuất khẩu; người mua (qua forwarder) lo xếp hàng lên tàu và các phí tại cảng đi.";
  b4.seller=["Làm thủ tục, nộp thuế và phí xuất khẩu, xin giấy phép nếu có","Cung cấp chứng từ xuất khẩu cho người mua"];
  b4.buyer=["Chịu phí hạ bãi, xếp hàng lên tàu theo hợp đồng vận tải của mình","Nhận vận đơn từ hãng tàu"];
  b4.tip="Theo FCA, người bán phải thông quan xuất khẩu; thực tế tờ khai được đăng ký trước khi bốc hàng. Chi phí tại cảng đi do người mua trả theo hợp đồng vận tải.";}
 else if(code==="CPT"||code==="CIP"){b4.s="Làm thủ tục xuất khẩu; người chuyên chở của mình xếp hàng lên tàu";b4.b="Theo dõi lịch tàu, nhận thông báo giao hàng";
  b4.cap="Người bán thông quan xuất khẩu và trả phí xếp hàng lên tàu (nằm trong cước). Rủi ro trong lúc xếp hàng thuộc người mua.";
  b4.seller=["Làm thủ tục, nộp thuế và phí xuất khẩu","Trả phí xếp hàng tại cảng đi theo hợp đồng vận tải"];
  b4.buyer=["Theo dõi lịch tàu","Chịu rủi ro nếu hàng hư hỏng khi xếp lên tàu"];
  b4.tip="Yêu cầu người bán gửi ngay vận đơn hoặc chứng từ vận tải để theo dõi lô hàng và mua bảo hiểm kịp thời.";}
 else if(code==="FAS"){b4.t="Thông quan XK & giao dọc mạn tàu";b4.s="Làm thủ tục xuất khẩu, đặt hàng dọc mạn tàu do người mua chỉ định";b4.b="Xếp hàng lên tàu, trả phí bốc xếp";
  b4.docs=dc("EXD","CO","DOCK");
  b4.cap="Người bán thông quan xuất khẩu và đặt hàng dọc mạn tàu tại cảng bốc. Rủi ro chuyển sang người mua tại đây; người mua lo xếp hàng lên tàu.";
  b4.seller=["Làm thủ tục, nộp thuế và phí xuất khẩu","Đặt hàng dọc mạn tàu (trên cầu cảng hoặc sà lan) đúng vị trí người mua chỉ định"];
  b4.buyer=["Chỉ định tàu, báo vị trí xếp hàng","Chịu chi phí và rủi ro xếp hàng lên tàu"];
  b4.tip="Nếu tàu đến trễ hoặc không nhận hàng, người mua chịu rủi ro và chi phí phát sinh. Không dùng FAS cho hàng container.";}
 else if(code==="FOB"){b4.t="Thông quan XK & xếp lên tàu";b4.s="Làm thủ tục xuất khẩu, xếp hàng lên tàu do người mua chỉ định";b4.b="Chỉ định tàu, báo tên tàu và thời gian xếp hàng";
  b4.docs=dc("EXD","CO","MR");
  b4.cap="Người bán thông quan xuất khẩu và xếp hàng lên con tàu do người mua chỉ định. Rủi ro chuyển khi hàng đã nằm trên tàu.";
  b4.seller=["Làm thủ tục, nộp thuế và phí xuất khẩu","Xếp hàng lên tàu, chịu chi phí đến khi hàng nằm trên tàu"];
  b4.buyer=["Chỉ định tàu, báo đủ thời gian cho người bán","Chịu rủi ro kể từ khi hàng đã xếp lên tàu"];
  b4.tip="Hàng container giao tại bãi (CY) trước khi lên tàu: rủi ro ở bãi vẫn thuộc người bán trên giấy nhưng khó chứng minh. ICC khuyên dùng FCA cho hàng container.";}
 else if(code==="CFR"||code==="CIF"){b4.t="Thông quan XK & xếp lên tàu";b4.s="Làm thủ tục xuất khẩu, thuê tàu, xếp hàng lên tàu";b4.b="Nhận thông báo đã xếp hàng; rủi ro chuyển khi hàng lên tàu";
  b4.docs=dc("EXD","CO","MR");
  b4.cap="Người bán thông quan xuất khẩu và xếp hàng lên tàu do mình thuê. Rủi ro chuyển sang người mua khi hàng đã nằm trên tàu, dù cước tới cảng đến do người bán trả.";
  b4.seller=["Làm thủ tục, nộp thuế và phí xuất khẩu","Thuê tàu, xếp hàng lên tàu, báo cho người mua"].concat(code==="CIF"?["Mua bảo hiểm ICC (C), tối thiểu 110% giá trị"]:[]);
  b4.buyer=["Nhận thông báo đã xếp hàng","Chịu rủi ro kể từ khi hàng đã xếp lên tàu"];
  b4.tip=code==="CIF"?"Bảo hiểm ICC (C) chỉ bồi thường một số rủi ro chính. Nên thỏa thuận người bán mua ICC (A) hoặc người mua tự mua bổ sung.":"Người bán không phải mua bảo hiểm. Người mua phải tự mua bảo hiểm có hiệu lực từ lúc hàng lên tàu tại cảng bốc.";}
 else{b4.s="Làm thủ tục xuất khẩu, xếp hàng lên tàu";b4.b=null;
  b4.docs=dc("EXD","CO","MR");
  b4.cap="Người bán thông quan xuất khẩu và xếp hàng lên tàu. Chi phí và rủi ro vẫn thuộc người bán.";
  b4.seller=["Làm thủ tục, nộp thuế và phí xuất khẩu","Xếp hàng lên tàu, trả phí tại cảng đi"];
  b4.buyer=["Không có nghĩa vụ ở bước này"];
  b4.tip="Người mua chưa chịu rủi ro. Yêu cầu người bán gửi thông tin tàu và chứng từ để chuẩn bị nhập khẩu.";}
 st.push(b4);
 /* B5 */
 var b5={t:"Vận chuyển quốc tế",place:"Trên tàu (ví dụ)"};
 if(c.main==="B"){b5.s=null;b5.b="Ký hợp đồng vận tải, trả cước, tự mua bảo hiểm ICC (A)";
  b5.docs=sea?dc("BL","SWB","INSB"):dc("BL","SWB","AWB","INSB");
  b5.cap="Người mua trả cước và chịu rủi ro suốt chặng vận chuyển quốc tế. Người bán không có nghĩa vụ vận chuyển hay bảo hiểm.";
  b5.seller=["Không có nghĩa vụ vận chuyển hoặc bảo hiểm"].concat(code==="FOB"||code==="FAS"?["Cung cấp chứng từ chứng minh đã giao hàng (biên lai, vận đơn nếu có)"]:[]);
  b5.buyer=["Ký hợp đồng vận tải, trả cước, nhận vận đơn",buyIns];
  b5.tip="Nhóm F: người mua kiểm soát hãng tàu và cước. Đảm bảo bảo hiểm có hiệu lực từ điểm chuyển rủi ro, không chỉ từ cảng.";}
 else{
  var insTx=c.ins==="A"?"; mua bảo hiểm ICC (A)":c.ins==="C"?"; mua bảo hiểm ICC (C)":"";
  b5.s="Trả cước tới "+(D?"nơi đến":"cảng đến")+insTx+"; gửi vận đơn cho người mua";
  b5.b=C?"Chịu rủi ro hàng trên đường; nhận bộ chứng từ, thanh toán":null;
  b5.docs=(sea?dc("BLOB","SWB"):dc("BL","MTD","AWB")).concat(c.ins==="A"?[DC.INSA]:c.ins==="C"?[DC.INSC]:C?[DC.INSB]:[]);
  b5.cap=C?"Người bán trả cước tới cảng đến"+(c.ins?" và mua bảo hiểm cho người mua":"")+", nhưng hàng trên đường là rủi ro của người mua."
          :"Người bán trả cước và chịu rủi ro suốt chặng vận chuyển quốc tế. Người mua chưa chịu rủi ro.";
  b5.seller=["Trả cước tới "+(D?"nơi đến quy định":"cảng đến quy định"),"Gửi vận đơn hoặc chứng từ vận tải cho người mua"].concat(c.ins==="A"?["Mua bảo hiểm ICC (A), tối thiểu 110% giá trị, cung cấp chứng từ bảo hiểm"]:c.ins==="C"?["Mua bảo hiểm ICC (C), tối thiểu 110% giá trị, cung cấp chứng từ bảo hiểm"]:[]);
  b5.buyer=C?["Chịu rủi ro hàng trên đường","Nhận bộ chứng từ, thanh toán theo L/C hoặc TT đối ứng chứng từ"].concat(c.ins?[]:[buyIns]):["Không có nghĩa vụ; theo dõi lịch tàu để chuẩn bị nhận hàng"];
  b5.tip=C?(c.ins==="A"?"Bảo hiểm ICC (A) đã có sẵn. Kiểm tra mức bồi thường, đồng tiền và nơi giải quyết bồi thường tại nước người mua.":c.ins==="C"?"ICC (C) không bảo hiểm nhiều rủi ro thường gặp (ví dụ: hư hỏng do nước mưa, trộm cắp). Cân nhắc mua thêm.":"Người bán không mua bảo hiểm. Nếu người mua không tự mua, hàng mất trên tàu sẽ không ai bồi thường.")
         :"Người bán chịu rủi ro nên tự quyết định có mua bảo hiểm hay không. Người mua không cần mua bảo hiểm chặng này.";}
 st.push(b5);
 /* B6 */
 var b6={t:"Dỡ hàng & thông quan nhập khẩu",place:"Cảng đến",docs:dc("IMD","AN","DO","SET")};
 if(code==="DDP"){b6.s="Làm thủ tục nhập khẩu, nộp thuế nhập khẩu, VAT và phí";b6.b="Cung cấp thông tin hỗ trợ khi người bán yêu cầu";
  b6.docs=dc("IMD","AN","DO","TAX");
  b6.cap="Người bán làm thủ tục nhập khẩu tại nước người mua, nộp thuế nhập khẩu và VAT. Rủi ro vẫn thuộc người bán.";
  b6.seller=["Khai báo nhập khẩu, nộp thuế nhập khẩu, VAT và các phí","Nhận hàng tại cảng đến, trả phí cảng"];
  b6.buyer=["Cung cấp thông tin, giấy phép khi người bán yêu cầu"];
  b6.tip="Người bán cần có tư cách làm thủ tục nhập khẩu tại nước người mua. Nếu không, nên chọn DAP. VAT nhập khẩu do người bán nộp thì người mua có thể không được khấu trừ.";}
 else if(code==="DAP"||code==="DPU"){b6.s="Dỡ hàng tại cảng, trả phí; hỗ trợ chứng từ cho người mua";b6.b="Khai báo, nộp thuế và phí nhập khẩu";
  b6.cap="Người mua làm thủ tục và nộp thuế nhập khẩu. Người bán vẫn chịu rủi ro và chi phí đưa hàng qua cảng.";
  b6.seller=["Dỡ hàng tại cảng đến, trả phí cảng theo hợp đồng vận tải","Cung cấp chứng từ để người mua làm thủ tục nhập khẩu"];
  b6.buyer=["Khai báo nhập khẩu, nộp thuế và phí","Hoàn tất thông quan kịp thời để không làm chậm việc giao hàng"];
  b6.tip="Nếu người mua thông quan chậm, chi phí lưu bãi phát sinh có thể do người mua chịu. Chuẩn bị đủ hồ sơ trước khi hàng đến.";}
 else{b6.s=C?"Trả phí dỡ hàng nếu đã nằm trong hợp đồng vận tải":null;b6.b="Khai báo, nộp thuế và phí nhập khẩu; nhận hàng từ tàu";
  b6.cap="Hàng được dỡ xuống bãi cảng đến. Người mua khai báo nhập khẩu, nộp thuế và phí; sau khi thông quan hàng mới được đưa đi.";
  b6.seller=C?["Chỉ trả phí dỡ hàng tại cảng đến nếu phí này nằm trong hợp đồng vận tải"]:["Không có nghĩa vụ ở bước này"];
  b6.buyer=["Khai báo nhập khẩu, nộp thuế và phí","Nhận hàng dỡ từ tàu, xử lý phí cảng và phí lưu bãi nếu có"];
  b6.tip=C?"Phí tại cảng đến (THC, D/O, lưu bãi) dễ bị đội lên khi hãng tàu do người bán chọn. Hỏi trước bảng phí local charges.":"Chuẩn bị đủ bộ chứng từ (vận đơn, hóa đơn, packing list, C/O nếu cần) trước khi tàu đến để tránh phí lưu bãi.";}
 st.push(b6);
 /* B7 */
 var b7={place:"Kho người mua"};
 if(D){b7.t=code==="DPU"?"Giao & dỡ hàng tại kho":"Giao tại kho người mua";
  b7.s=code==="DPU"?"Chở hàng tới kho người mua và dỡ hàng xuống":"Chở hàng tới kho, giao trên xe sẵn sàng để dỡ";
  b7.b=code==="DPU"?"Kiểm tra, ký nhận, nhập kho":"Dỡ hàng, kiểm tra, nhập kho";
  b7.docs=dc("DN","POD","GRN","PA");
  b7.cap=code==="DPU"?"Người bán chở hàng tới kho người mua và dỡ hàng xuống. Rủi ro chuyển sang người mua khi hàng đã dỡ xong.":
    "Người bán chở hàng tới kho người mua, hàng còn trên xe sẵn sàng để dỡ. Rủi ro chuyển tại đây; người mua dỡ hàng và nhập kho.";
  b7.seller=code==="DPU"?["Chở hàng tới nơi đến, dỡ hàng xuống, chịu chi phí và rủi ro dỡ hàng","Nhận thanh toán theo hợp đồng"]:["Chở hàng tới nơi đến, đặt hàng dưới quyền định đoạt của người mua trên phương tiện","Nhận thanh toán theo hợp đồng"];
  b7.buyer=code==="DPU"?["Kiểm tra số lượng, chất lượng, ký biên bản, nhập kho","Thanh toán theo hợp đồng"]:["Dỡ hàng, chịu chi phí và rủi ro dỡ hàng","Kiểm tra, ký biên bản, nhập kho, thanh toán theo hợp đồng"];
  b7.tip=code==="DPU"?"Nơi đến phải dỡ hàng được (có mặt bằng, lối xe). Ghi rõ vị trí dỡ trong hợp đồng.":"Ghi rõ địa chỉ, giờ nhận hàng. Chuẩn bị xe nâng hoặc nhân công dỡ hàng ngay khi xe đến để tránh phí chờ.";}
 else{b7.t="Vận chuyển nội địa & nhập kho";b7.s="Nhận thanh toán theo hợp đồng";b7.b="Thuê xe chở hàng về kho, kiểm tra, nhập kho";
  b7.docs=dc("DN","GRN","PA");
  b7.cap="Sau thông quan, hàng được bốc lên xe tải nội địa của người mua chở về kho. Người mua kiểm tra và nhập kho.";
  b7.seller=["Nhận thanh toán theo hợp đồng (Incoterms không quy định thanh toán)"];
  b7.buyer=["Bốc hàng lên xe, thuê xe vận chuyển nội địa, chịu cước và rủi ro","Kiểm tra số lượng, chất lượng, nhập kho"];
  b7.tip=(code==="CPT"||code==="CIP")?"Nếu nơi đến quy định là kho người mua (thay vì cảng đến), cước chặng này do người bán trả, nhưng rủi ro vẫn thuộc người mua.":"Bảo hiểm cần phủ đến tận kho người mua (điều khoản kho tới kho). Lập biên bản ngay nếu hàng thiếu hoặc hỏng để khiếu nại.";}
 st.push(b7);
 return st;
}

/* chi phí & PIC từng bước (S, B, SB = chia) */
var COST={EXW:"SSBBBBB",FCA:["S","S","B","SB","B","B","B"],CPT:"SSSSSBB",CIP:"SSSSSBB",DAP:["S","S","S","S","S","SB","SB"],DPU:["S","S","S","S","S","SB","S"],DDP:"SSSSSSS".split("").slice(0,6).concat(["SB"]),
 FAS:["S","S","S","SB","B","B","B"],FOB:"SSSSBBB",CFR:"SSSSSBB",CIF:"SSSSSBB"};
var PICS={EXW:["S","SB","B","B","B","B","B"],FCA:["S","SB","B","SB","B","B","B"],CPT:["S","S","S","S","S","B","B"],CIP:["S","S","S","S","S","B","B"],
 DAP:["S","S","S","S","S","SB","SB"],DPU:["S","S","S","S","S","SB","SB"],DDP:["S","S","S","S","S","S","SB"],
 FAS:["S","S","S","SB","B","B","B"],FOB:["S","S","S","SB","B","B","B"],CFR:["S","S","S","S","S","B","B"],CIF:["S","S","S","S","S","B","B"]};
