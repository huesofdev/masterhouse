import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, StatusBar, Modal, Image, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '../../src/store/useCartStore';
import { useTripStore } from '../../src/store/useTripStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSyncStore } from '../../src/store/useSyncStore';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { db } from '../../src/db';
import { customers, sales, saleItems, tripStock, syncQueue, promotions, installmentSchemes, taxes, preOrders, settings, products } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import SignatureScreen from 'react-native-signature-canvas';
import { syncEngine } from '../../src/db/sync';
import { PrintService } from '../../src/lib/PrintService';
import DateTimePicker from '@react-native-community/datetimepicker';

const C = {
  bg: '#000000', card: '#111111', cardBorder: '#1E1E1E', amber: '#D97706',
  amberDim: 'rgba(217, 119, 6, 0.12)', white: '#F8FAFC', gray: '#9CA3AF',
  green: '#059669', greenDim: 'rgba(5, 150, 105, 0.12)', red: '#EF4444',
  violet: '#7C3AED', violetDim: 'rgba(124, 58, 237, 0.12)',
};

export default function Checkout() {
  const { items, getTotal, getItemLineTotal, clearCart, preOrderId, customerId: cartCustomerId, partialRecoveryDate } = useCartStore();
  const { activeTripId } = useTripStore();
  const { user } = useAuthStore();
  const total = getTotal(); // This total now correctly accounts for per-line discounts

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [customerList, setCustomerList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [saleType, setSaleType] = useState<'DIRECT' | 'INSTALLMENT'>('DIRECT');

  const sortedCustomers = [...customerList].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA;
  });

  const filteredCustomers = sortedCustomers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.nic || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  const displayCustomers = searchQuery ? filteredCustomers.slice(0, 5) : filteredCustomers.slice(0, 1);

  // Booking Deposit
  const [bookingDeposit, setBookingDeposit] = useState(0);
  
  // Installment Schemes
  const [schemeList, setSchemeList] = useState<any[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);

  // Taxes
  const [activeTaxes, setActiveTaxes] = useState<any[]>([]);
  
  // Downpayment & Extra Cash
  const [downpaymentStr, setDownpaymentStr] = useState('');
  const [extraCashStr, setExtraCashStr] = useState('');
  const [recoveryDateStr, setRecoveryDateStr] = useState(partialRecoveryDate || '');
  const [maxRecoveryDays, setMaxRecoveryDays] = useState(14);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const onDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setRecoveryDateStr(date.toISOString().split('T')[0]);
    }
  };

  // Computations
  const downpaymentInput = parseFloat(downpaymentStr) || 0;
  const extraCashPaid = parseFloat(extraCashStr) || 0;

  // Ref to pass finalDownpayment from confirmSale() → processSaleTransaction()
  const finalDownpaymentRef = useRef(0);

  const discountedSubtotal = total;

  // Calculate Taxes
  let totalTaxAmount = 0;
  const taxDetails: any[] = [];
  let exclusiveTaxAmount = 0;

  activeTaxes.forEach(tax => {
    if (tax.type === 'EXCLUSIVE') {
      const amt = (discountedSubtotal * tax.rate) / 100;
      exclusiveTaxAmount += amt;
      totalTaxAmount += amt;
      taxDetails.push({ id: tax.id, name: tax.name, rate: tax.rate, type: tax.type, amount: amt });
    } else if (tax.type === 'INCLUSIVE') {
      const amt = discountedSubtotal - (discountedSubtotal / (1 + tax.rate / 100));
      totalTaxAmount += amt;
      taxDetails.push({ id: tax.id, name: tax.name, rate: tax.rate, type: tax.type, amount: amt });
    }
  });

  // Gross total is the absolute total before any deposits are subtracted
  const grossTotal = discountedSubtotal + exclusiveTaxAmount;
  // Final total is what we display to the user as the remaining balance for this transaction
  const finalTotal = Math.max(0, grossTotal - bookingDeposit);

  // Min downpayment: use GROSS total to match backend validation (sales.service.ts L479)
  const selectedScheme = schemeList.find(sc => sc.id === selectedSchemeId);
  const minDownpayment = useMemo(() => {
    if (!selectedScheme) return 0;
    const schemePercent = (selectedScheme.minDownpaymentPercent || 0) / 100;
    return items
      .filter(item => !item.isFulfillmentPlaceholder)
      .reduce((sum, item) => {
        const flatDp = (item.minDownpaymentAmount || 0) * item.qty;
        const schemeDp = getItemLineTotal(item) * schemePercent;
        return sum + Math.max(flatDp, schemeDp);
      }, 0);
  }, [items, selectedScheme, getItemLineTotal]);
  const minGap = Math.max(0, minDownpayment - bookingDeposit);
  const maxExtraCash = Math.max(0, grossTotal - bookingDeposit);

  const schemeInterestAmount = useMemo(() => {
    if (saleType !== 'INSTALLMENT' || !selectedScheme) return 0;
    const dp = preOrderId ? (bookingDeposit + extraCashPaid) : downpaymentInput;
    const effectiveDp = dp < minDownpayment ? minDownpayment : dp;
    const principal = Math.max(0, grossTotal - effectiveDp);
    const rate = parseFloat(selectedScheme.interestRate?.toString() || '0');
    return principal * (rate / 100);
  }, [saleType, selectedScheme, preOrderId, bookingDeposit, extraCashPaid, downpaymentInput, minDownpayment, grossTotal]);

  const totalWithInterest = grossTotal + schemeInterestAmount;

  const getCollectAmount = () => {
    if (saleType === 'DIRECT') {
      return preOrderId ? finalTotal : grossTotal;
    } else {
      return preOrderId ? extraCashPaid : downpaymentInput;
    }
  };

  const getCollectLabel = () => {
    if (saleType === 'DIRECT') {
      return preOrderId ? 'Balance to Collect' : 'Total to Collect';
    } else {
      return preOrderId ? 'Extra Cash to Collect' : 'Downpayment to Collect';
    }
  };

  useEffect(() => {
    if (saleType === 'INSTALLMENT' && preOrderId && selectedScheme) {
      if (!extraCashStr) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExtraCashStr(minGap > 0 ? minGap.toString() : '0');
      }
    }
  }, [selectedSchemeId, saleType, preOrderId, minGap]);

  // Auto-fill downpayment with min downpayment when scheme is selected (non-preOrder)
  useEffect(() => {
    if (saleType === 'INSTALLMENT' && !preOrderId && minDownpayment > 0) {
      setDownpaymentStr(minDownpayment.toFixed(2));
    }
  }, [selectedSchemeId, minDownpayment]);

  // Guarantor
  const [gName, setGName] = useState('');
  const [gNic, setGNic] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gAddress, setGAddress] = useState('');
  const [gNicFront, setGNicFront] = useState<string | null>(null);
  const [gNicBack, setGNicBack] = useState<string | null>(null);
  const [gSignature, setGSignature] = useState<string | null>(null);
  const [guarantorModal, setGuarantorModal] = useState(false);
  const [gSigModal, setGSigModal] = useState(false);
  const gSigRef = useRef<any>(null);

  const [signature, setSignature] = useState<string | null>(null);
  const [sigModal, setSigModal] = useState(false);
  const sigRef = useRef<any>(null);

  const pickImage = async (setter: (uri: string) => void) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture images.');
        return;
      }
      // Capture at quality 0.7 to safely handle 50MP/108MP camera modes without RAM exhaustion
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Resize to max 1280px wide (maintains aspect ratio) at 60% JPEG quality
        // Reduces file size from 500KB-1.5MB down to ~80-200KB while keeping NIC text legible
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1280 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        setter(compressed.uri);
      }
    } catch (e: any) {
      console.warn('Error launching camera:', e);
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const loadBookingDeposit = async () => {
    if (preOrderId) {
      try {
        const res = await db.select().from(preOrders).where(eq(preOrders.id, preOrderId)).limit(1);
        if (res.length > 0) {
          setBookingDeposit(res[0].advancePayment || 0);
        }
      } catch (e) {
        console.warn('Failed to load booking deposit', e);
      }
    } else {
      setBookingDeposit(0);
    }
  };

  const loadCustomersAndPromos = async () => {
    try {
      const res = await db.select().from(customers);
      setCustomerList(res);
      // Auto-select customer from cart store (set by pending-orders fulfillment flow)
      if (cartCustomerId && !selectedCustomerId) {
        setSelectedCustomerId(cartCustomerId);
      }
      const schemes = await db.select().from(installmentSchemes);
      setSchemeList(schemes);
      const taxList = await db.select().from(taxes);
      setActiveTaxes(taxList.filter(t => t.isActive));
      const s = await db.select().from(settings).limit(1);
      if (s.length > 0 && s[0].partialRecoveryDaysMax) {
        setMaxRecoveryDays(s[0].partialRecoveryDaysMax);
      }
    } catch (e) {
      console.warn('No customers/promos yet');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCustomersAndPromos();
      loadBookingDeposit();
    }, [preOrderId])
  );

  const handleSignature = async (sig: string) => {
    try {
      const base64Data = sig.replace('data:image/png;base64,', '');
      const uri = FileSystem.cacheDirectory + `sig_${Crypto.randomUUID()}.png`;
      await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      setSignature(uri);
      setSigModal(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save signature image');
    }
  };

  const handleGSignature = async (sig: string) => {
    try {
      const base64Data = sig.replace('data:image/png;base64,', '');
      const uri = FileSystem.cacheDirectory + `gsig_${Crypto.randomUUID()}.png`;
      await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      setGSignature(uri);
      setGSigModal(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save guarantor signature');
    }
  };

  const confirmSale = () => {
    if (isSubmitting) return;

    if (preOrderId) {
      const placeholders = items.filter(i => i.isFulfillmentPlaceholder);
      const actualItems = items.filter(i => !i.isFulfillmentPlaceholder);
      
      for (const ph of placeholders) {
        const matchingQty = actualItems.filter(i => i.productId === ph.productId).reduce((sum, i) => sum + i.qty, 0);
        if (matchingQty < ph.qty) {
          Alert.alert('Incomplete Fulfillment', `You need to select ${ph.qty - matchingQty} more serial number(s) for ${ph.name}. Partial fulfillment is not supported.`);
          return;
        }
      }
    }

    if (saleType === 'INSTALLMENT' && selectedCustomerId === null) {
      Alert.alert('Not Allowed', 'Installment sales cannot be made for Walk-in customers. Please select or create a registered customer.');
      return;
    }

    if (saleType === 'INSTALLMENT' && (!gName || !gNic || !gPhone || !gAddress || !gNicFront || !gNicBack)) {
      Alert.alert('Required', 'Guarantor details (including NIC images, Address and Mobile) are required for installment sales.');
      return;
    }

    if (saleType === 'INSTALLMENT') {
      const nicRegex = /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/;
      if (!nicRegex.test(gNic)) {
        Alert.alert('Invalid NIC', 'Please enter a valid Sri Lankan NIC (9 digits + V/X or 12 digits).');
        return;
      }

      const phoneRegex = /^0[0-9]{9}$/;
      if (!phoneRegex.test(gPhone)) {
        Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number starting with 0.');
        return;
      }
    }

    if (saleType === 'INSTALLMENT' && activeTripId && (!signature || !gSignature)) {
      Alert.alert('Required', 'Customer and Guarantor signatures are strictly required for field (trip) installment sales.');
      return;
    }

    if (saleType === 'INSTALLMENT' && !selectedSchemeId) {
      Alert.alert('Required Fields', 'Please fill downpayment, guarantor name, NIC, and mobile.');
      return;
    }

    if (preOrderId && grossTotal < bookingDeposit) {
      Alert.alert(
        'Invalid Discount', 
        `You cannot apply discounts that drop the total price (Rs. ${grossTotal.toFixed(2)}) below the deposit the customer already paid (Rs. ${bookingDeposit.toFixed(2)}).`
      );
      return;
    }

    // Determine final downpayment to save based on sale context

    let computedFinalDownpayment = 0;
    
    if (saleType === 'INSTALLMENT') {
      if (preOrderId) {
        // We are fulfilling a booking
        const minGap = Math.max(0, minDownpayment - bookingDeposit);
        if (extraCashPaid < minGap) {
          if (!recoveryDateStr) {
            Alert.alert('Invalid', `You only collected Rs. ${extraCashPaid.toFixed(2)} extra cash, which is less than the required gap of Rs. ${minGap.toFixed(2)}. Please provide a Recovery Date for the remaining balance.`);
            return;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(recoveryDateStr)) {
            Alert.alert('Invalid Date', 'Please format Recovery Date as YYYY-MM-DD');
            return;
          }
          
          const recDate = new Date(recoveryDateStr);
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + maxRecoveryDays);
          if (recDate > maxDate) {
            Alert.alert('Invalid Date', `Recovery Date cannot exceed ${maxRecoveryDays} days from today.`);
            return;
          }
          if (recDate < new Date(new Date().setHours(0,0,0,0))) {
            Alert.alert('Invalid Date', `Recovery Date cannot be in the past.`);
            return;
          }
        }
        
        const remainingBalance = finalTotal;
        if (extraCashPaid >= remainingBalance) {
          Alert.alert('Invalid', `If the customer is paying the full balance of Rs. ${remainingBalance.toFixed(2)}, please select 'Cash / Direct' mode instead of Installment.`);
          return;
        }
        
        computedFinalDownpayment = bookingDeposit + extraCashPaid;
      } else {
        // Normal installment sale
        if (downpaymentInput < minDownpayment) {
          if (!recoveryDateStr) {
             Alert.alert('Invalid', `Downpayment is less than minimum (Rs. ${minDownpayment.toFixed(2)}). Please provide a Recovery Date for the remaining balance.`);
             return;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(recoveryDateStr)) {
             Alert.alert('Invalid Date', 'Please format Recovery Date as YYYY-MM-DD');
             return;
          }
          
          const recDate = new Date(recoveryDateStr);
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + maxRecoveryDays);
          if (recDate > maxDate) {
            Alert.alert('Invalid Date', `Recovery Date cannot exceed ${maxRecoveryDays} days from today.`);
            return;
          }
          if (recDate < new Date(new Date().setHours(0,0,0,0))) {
            Alert.alert('Invalid Date', `Recovery Date cannot be in the past.`);
            return;
          }
        }
        if (downpaymentInput >= finalTotal) {
          Alert.alert('Invalid', `If the customer is paying the full total of Rs. ${finalTotal.toFixed(2)}, please select 'Cash / Direct' mode instead of Installment.`);
          return;
        }
        computedFinalDownpayment = downpaymentInput;
      }
    } else {
      // For DIRECT sales, downpayment is just the booking deposit if fulfilling
      computedFinalDownpayment = preOrderId ? bookingDeposit : 0;
    }
    finalDownpaymentRef.current = computedFinalDownpayment;

    // Validate per-line discounts against user's max allowed %
    const maxAllowed = user?.max_discount_percentage || 0;
    for (const item of items) {
      if (item.discountInput) {
        const baseTotal = item.price * item.qty;
        let discAmt = 0;
        if (item.discountInput.endsWith('%')) {
          const pct = parseFloat(item.discountInput.replace('%', '')) || 0;
          discAmt = baseTotal * (pct / 100);
        } else if (item.discountInput.startsWith('*')) {
          const val = parseFloat(item.discountInput.replace('*', '')) || 0;
          discAmt = val * item.qty;
        } else {
          discAmt = parseFloat(item.discountInput) || 0;
        }
        const discPct = baseTotal > 0 ? (discAmt / baseTotal) * 100 : 0;
        if (discPct > maxAllowed) {
          Alert.alert(
            'Discount Exceeds Limit',
            `"${item.name}" has a ${discPct.toFixed(1)}% discount (Rs. ${discAmt.toFixed(2)}) which exceeds your authorized limit of ${maxAllowed}%.`
          );
          return;
        }
      }
    }

    Alert.alert(
      "Confirm Sale",
      `Are you sure you want to complete this transaction for Rs. ${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Confirm", onPress: () => processSaleTransaction() }
      ]
    );
  };

  const processSaleTransaction = async () => {
    // Check if any serialized item in the cart has already been sold
    for (const item of items) {
      if (item.serialItemId) {
        const stockRecord = await db.select().from(tripStock).where(
          eq(tripStock.serialItemId, item.serialItemId)
        ).limit(1);
        if (stockRecord.length > 0 && stockRecord[0].soldQty > 0) {
          Alert.alert(
            'Error',
            `Serial number "${item.serialNumber}" has already been sold on this trip. Please remove it from the cart.`
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Copy signatures and guarantor NIC images to persistent storage before sync
      const { persistFile } = await import('../../src/db/sync');
      const persistentSignature = await persistFile(signature);
      const persistentGSignature = await persistFile(gSignature);
      const persistentGNicFront = await persistFile(gNicFront);
      const persistentGNicBack = await persistFile(gNicBack);

      let currentLat: number | null = null;
      let currentLng: number | null = null;

      const isGpsEnabled = await Location.hasServicesEnabledAsync();
      if (!isGpsEnabled) {
        Alert.alert('GPS Disabled', 'Please turn on Location / GPS services in your device settings.');
        setIsSubmitting(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location is strictly required to confirm this sale.');
        setIsSubmitting(false);
        return;
      }

      let timeoutId: any;
      try {
        const location = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('timeout')), 10000);
          })
        ]) as Location.LocationObject;
        clearTimeout(timeoutId);
        currentLat = location.coords.latitude;
        currentLng = location.coords.longitude;
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        Alert.alert('GPS Error', 'Could not lock onto GPS satellites. Please move outdoors or near a window for a clear sky view and try again.');
        setIsSubmitting(false);
        return;
      }

      const saleId = Crypto.randomUUID();
      const now = new Date();

      const salePayload = {
        id: saleId,
        customerId: selectedCustomerId,
        saleType,
        totalAmount: grossTotal, // FIXED: Use grossTotal instead of finalTotal (which is reduced by bookingDeposit)
        downpayment: finalDownpaymentRef.current,
        partialDownpaymentRecoveryDate: (saleType === 'INSTALLMENT' && finalDownpaymentRef.current < minDownpayment) ? recoveryDateStr : null,
        taxAmount: totalTaxAmount,
        taxDetails: JSON.stringify(taxDetails),
        preOrderId: preOrderId || null,
        schemeId: saleType === 'INSTALLMENT' ? selectedSchemeId : null,
        gpsLat: currentLat,
        gpsLng: currentLng,
        createdAt: now,
      };

      const syncPayload: any = {
        id: saleId,
        offline_receipt_number: saleId.split('-')[0].toUpperCase(),
        trip_id: activeTripId,
        customer_id: selectedCustomerId,
        sale_type: saleType,
        payment_mode: 'CASH', // Mobile POS currently only supports cash payments
        subtotal: items.filter(i => !i.isFulfillmentPlaceholder).reduce((sum, item) => sum + (item.price * item.qty), 0),
        promotion_id: null,
        promotion_discount: 0,
        manual_discount: 0,
        tax_amount: totalTaxAmount,
        tax_details: JSON.stringify(taxDetails),
        total: grossTotal, // FIXED: Send grossTotal to backend so deposit isn't double-deducted
        downpayment: finalDownpaymentRef.current,
        partial_downpayment_recovery_date: (saleType === 'INSTALLMENT' && finalDownpaymentRef.current < minDownpayment) ? recoveryDateStr : null,
        scheme_id: saleType === 'INSTALLMENT' ? selectedSchemeId : null,
        pre_order_id: preOrderId,
        gps_lat: currentLat,
        gps_lng: currentLng,
      };

      await db.transaction(async (tx) => {
        await tx.insert(sales).values(salePayload);

        if (preOrderId) {
          await tx.update(preOrders).set({ status: 'FULFILLED' }).where(eq(preOrders.id, preOrderId));
        }

        const sItems = items.filter(i => !i.isFulfillmentPlaceholder).map(item => {
          const lineTotal = getItemLineTotal(item);
          const baseTotal = item.price * item.qty;
          const discountAmount = baseTotal - lineTotal;
          let discountType: 'PERCENTAGE' | 'FLAT_LINE' | 'FLAT_UNIT' | null = null;
          if (item.discountInput && discountAmount > 0) {
            if (item.discountInput.endsWith('%')) discountType = 'PERCENTAGE';
            else if (item.discountInput.startsWith('*')) discountType = 'FLAT_UNIT';
            else discountType = 'FLAT_LINE';
          }
          
          return {
            id: Crypto.randomUUID(),
            saleId,
            productId: item.productId,
            serialItemId: item.serialItemId || null,
            qty: item.qty,
            unitPrice: item.price,
            discountAmount,
            discountType,
            lineTotal,
          };
        });

        const syncItems = items.filter(i => !i.isFulfillmentPlaceholder).map(item => {
          const lineTotal = getItemLineTotal(item);
          const baseTotal = item.price * item.qty;
          const discountAmount = baseTotal - lineTotal;
          let discountType: 'PERCENTAGE' | 'FLAT_LINE' | 'FLAT_UNIT' | null = null;
          if (item.discountInput && discountAmount > 0) {
            if (item.discountInput.endsWith('%')) discountType = 'PERCENTAGE';
            else if (item.discountInput.startsWith('*')) discountType = 'FLAT_UNIT';
            else discountType = 'FLAT_LINE';
          }

          return {
            product_id: item.productId,
            serial_item_id: item.serialItemId || null,
            quantity: item.qty,
            unit_price: item.price,
            discount_amount: discountAmount,
            discount_type: discountType,
            line_total: lineTotal,
          };
        });

        for (const si of sItems) {
          await tx.insert(saleItems).values(si);
          try {
            const stockRecord = await tx.select().from(tripStock).where(
              si.serialItemId 
                ? eq(tripStock.serialItemId, si.serialItemId)
                : eq(tripStock.productId, si.productId)
            ).limit(1);
            if (stockRecord.length > 0) {
              await tx.update(tripStock).set({ soldQty: stockRecord[0].soldQty + si.qty }).where(eq(tripStock.id, stockRecord[0].id));
            }
          } catch {}
        }

        if (saleType === 'INSTALLMENT') {
          syncPayload.new_guarantor = {
            full_name: gName, nic: gNic, mobile: gPhone, address: gAddress,
            nic_front_url: persistentGNicFront, nic_back_url: persistentGNicBack
          };
          syncPayload.signature_image_url = persistentSignature;
          syncPayload.guarantor_signature_image_url = persistentGSignature;
        }

        await syncEngine.enqueueOperation('CREATE_SALE', { ...syncPayload, items: syncItems }, tx);
      });

      // Post-transaction success logic: update UI store and process queue
      const countRes = await db.select().from(syncQueue).where(eq(syncQueue.status, 'pending'));
      useSyncStore.getState().setPendingCount(countRes.length);
      syncEngine.forceSync();
      
      const customerName = selectedCustomerId 
        ? customerList.find(c => c.id === selectedCustomerId)?.name || ''
        : 'Walk-in Customer';

      // Fetch fresh product details to ensure warranty info is injected into the print receipt
      const allProducts = await db.select().from(products);
      const prodMap = new Map();
      allProducts.forEach(p => prodMap.set(p.id, p));

      const printItems = items.filter(i => !i.isFulfillmentPlaceholder).map(i => {
        const cLineTotal = getItemLineTotal(i);
        const cBaseTotal = i.price * i.qty;
        const cDiscountAmt = cBaseTotal - cLineTotal;
        const dbProd = prodMap.get(i.productId);
        return { 
          ...i, 
          computedDiscountAmount: cDiscountAmt, 
          computedLineTotal: cLineTotal,
          warrantyType: dbProd?.warrantyType,
          warrantyYears: dbProd?.warrantyYears,
          warrantyMonths: dbProd?.warrantyMonths
        };
      });

      Alert.alert('✅ Sale Complete', 'Transaction saved offline & queued for sync', [
        { 
          text: 'Print Bill', 
          onPress: async () => { 
            await PrintService.printSaleReceipt(
              saleId, 
              customerName, 
              saleType, 
              printItems, 
              total, 
              0, // No campaign promotion discount
              finalDownpaymentRef.current, 
              grossTotal,
              taxDetails,
              selectedScheme,
              bookingDeposit,
              (saleType === 'INSTALLMENT' && selectedScheme && finalDownpaymentRef.current < minDownpayment) ? recoveryDateStr : null
            );
            clearCart(); 
            router.replace('/'); 
          } 
        },
        { 
          text: 'Done', 
          onPress: () => { clearCart(); router.replace('/'); } 
        },
      ], { cancelable: false });
    } catch (e) {
      console.error("Checkout Transaction Failed:", e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown database error occurred.';
      Alert.alert(
        'Transaction Failed', 
        `The sale was NOT saved and no inventory was deducted.\n\nReason: ${errorMessage}\n\nPlease try tapping Confirm Sale again.`
      );
      setIsSubmitting(false);
    }
  };

  const calculateInstallment = () => {
    const selectedScheme = schemeList.find(s => s.id === selectedSchemeId);
    if (!selectedScheme) return 0;
    const dp = preOrderId ? (bookingDeposit + extraCashPaid) : downpaymentInput;
    const effectiveDp = dp < minDownpayment ? minDownpayment : dp;
    const principal = grossTotal - effectiveDp;
    const interest = principal * (parseFloat(selectedScheme.interestRate?.toString() || '0') / 100);
    return (principal + interest) / (selectedScheme.terms || 1);
  };

  const renderCartSnapshot = () => {
    const selectedScheme = schemeList.find(s => s.id === selectedSchemeId);
    let interestAmount = 0;
    if (saleType === 'INSTALLMENT' && selectedScheme) {
      const dp = preOrderId ? (bookingDeposit + extraCashPaid) : downpaymentInput;
      const effectiveDp = dp < minDownpayment ? minDownpayment : dp;
      const principal = grossTotal - effectiveDp;
      interestAmount = principal * (parseFloat(selectedScheme.interestRate?.toString() || '0') / 100);
    }

    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={s.sectionTitle}>ITEMS & CHARGES</Text>
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder }}>
          {items.filter(item => !item.isFulfillmentPlaceholder).map((item, idx) => {
            const lineTotal = getItemLineTotal(item);
            const originalTotal = item.price * item.qty;
            const discountAmt = originalTotal - lineTotal;
            return (
              <View key={item.cartItemId || idx} style={{ borderBottomWidth: idx < items.filter(i => !i.isFulfillmentPlaceholder).length - 1 ? 1 : 0, borderColor: '#222', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: C.white, fontSize: 14, fontWeight: '600' }}>{item.name}</Text>
                    {item.serialNumber && (
                      <Text style={{ color: C.amber, fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>SN: {item.serialNumber}</Text>
                    )}
                    <Text style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>
                      Qty: {item.qty} × Rs. {item.price.toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {discountAmt > 0 ? (
                      <>
                        <Text style={{ color: C.gray, fontSize: 12, textDecorationLine: 'line-through' }}>Rs. {originalTotal.toLocaleString()}</Text>
                        <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>Rs. {lineTotal.toLocaleString()}</Text>
                      </>
                    ) : (
                      <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>Rs. {lineTotal.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
                {discountAmt > 0 && (
                  <Text style={{ color: C.red, fontSize: 11, marginTop: 4 }}>Discount: - Rs. {discountAmt.toLocaleString()}</Text>
                )}
              </View>
            );
          })}

          <View style={{ borderTopWidth: 1, borderColor: '#333', marginTop: 12, paddingTop: 12, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.gray, fontSize: 12 }}>Subtotal</Text>
              <Text style={{ color: C.white, fontSize: 12, fontWeight: '500' }}>
                Rs. {items.filter(i => !i.isFulfillmentPlaceholder).reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()}
              </Text>
            </View>

            {items.reduce((sum, item) => sum + ((item.price * item.qty) - getItemLineTotal(item)), 0) > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.red, fontSize: 12 }}>Item Discounts</Text>
                <Text style={{ color: C.red, fontSize: 12, fontWeight: '500' }}>
                  - Rs. {items.reduce((sum, item) => sum + ((item.price * item.qty) - getItemLineTotal(item)), 0).toLocaleString()}
                </Text>
              </View>
            )}


            {taxDetails.map((tax: any, idx) => (
              <View key={tax.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.gray, fontSize: 12 }}>{tax.name} ({tax.rate}%)</Text>
                <Text style={{ color: C.white, fontSize: 12, fontWeight: '500' }}>Rs. {tax.amount.toLocaleString()}</Text>
              </View>
            ))}

            {bookingDeposit > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#0EA5E9', fontSize: 12 }}>Booking Deposit Applied</Text>
                <Text style={{ color: '#0EA5E9', fontSize: 12, fontWeight: '500' }}>- Rs. {bookingDeposit.toLocaleString()}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#222', marginTop: 6, paddingTop: 6 }}>
              <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>Net Payable</Text>
              <Text style={{ color: C.amber, fontSize: 16, fontWeight: '800' }}>Rs. {(finalTotal + interestAmount).toLocaleString()}</Text>
            </View>

            {saleType === 'INSTALLMENT' && selectedScheme && (() => {
              const dp = preOrderId ? (bookingDeposit + extraCashPaid) : downpaymentInput;
              const shortfall = Math.max(0, minDownpayment - dp);
              const financedPrincipal = Math.max(0, grossTotal - (dp < minDownpayment ? minDownpayment : dp));
              return (
                <View style={{ borderTopWidth: 1, borderColor: '#333', marginTop: 12, paddingTop: 12, gap: 6 }}>
                  <Text style={{ color: C.amber, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Installment Structure</Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: C.gray, fontSize: 12 }}>Downpayment Paid</Text>
                    <Text style={{ color: C.white, fontSize: 12, fontWeight: '500' }}>Rs. {dp.toLocaleString()}</Text>
                  </View>

                  {shortfall > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#F59E0B', fontSize: 12 }}>Downpayment Recovery (Gap)</Text>
                      <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '700' }}>
                        Rs. {shortfall.toLocaleString()} {recoveryDateStr ? `(Due: ${recoveryDateStr})` : ''}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: C.gray, fontSize: 12 }}>Remaining Balance (w/ Interest)</Text>
                    <Text style={{ color: C.white, fontSize: 12, fontWeight: '700' }}>
                      Rs. {(financedPrincipal + (financedPrincipal * (parseFloat(selectedScheme.interestRate?.toString() || '0') / 100))).toLocaleString()}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: C.gray, fontSize: 12 }}>Installment Payment</Text>
                    <Text style={{ color: C.amber, fontSize: 14, fontWeight: '700' }}>
                      Rs. {calculateInstallment().toFixed(2)} × {selectedScheme.terms} {selectedScheme.frequency.toLowerCase()}s
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => { Keyboard.dismiss(); router.back(); }} style={s.backBtn}>
          <Text style={{ color: C.amber, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 380 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {step === 1 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 }}>
              <Text style={{ color: C.amber, fontSize: 16, fontWeight: '700' }}>Step 1 of {saleType === 'INSTALLMENT' ? '5' : '3'}</Text>
              <Text style={{ color: C.gray, fontSize: 14 }}>Payment Mode</Text>
            </View>

            <Text style={s.sectionTitle}>CHOOSE PAYMENT TYPE</Text>
            <View style={s.typeRow}>
              <TouchableOpacity
                style={[s.typeBtn, saleType === 'DIRECT' && s.typeBtnActive]}
                onPress={() => {
                  setSaleType('DIRECT');
                  if (!preOrderId) {
                    setSelectedCustomerId(null);
                  }
                }}
              >
                <Text style={{ fontSize: 24 }}>💵</Text>
                <Text style={[s.typeText, saleType === 'DIRECT' && { color: C.amber }]}>Direct / Cash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[s.typeBtn, saleType === 'INSTALLMENT' && s.typeBtnActive]}
                onPress={() => {
                  setSaleType('INSTALLMENT');
                  if (!preOrderId) {
                    setSelectedCustomerId(null);
                  }
                }}
              >
                <Text style={{ fontSize: 24 }}>📅</Text>
                <Text style={[s.typeText, saleType === 'INSTALLMENT' && { color: C.amber }]}>Installment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 }}>
              <Text style={{ color: C.amber, fontSize: 16, fontWeight: '700' }}>Step 2 of {saleType === 'INSTALLMENT' ? '5' : '3'}</Text>
              <Text style={{ color: C.gray, fontSize: 14 }}>Select Customer</Text>
            </View>

            <Text style={s.sectionTitle}>CUSTOMER</Text>
            {preOrderId ? (
              <View style={[s.optionCard, s.optionSelected]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 16 }}>👤 </Text>
                    <Text style={[s.optionText, { color: C.amber }]}>
                      {selectedCustomerId ? customerList.find(c => c.id === selectedCustomerId)?.name || 'Loading...' : 'Loading...'}
                    </Text>
                  </View>
                  <Text style={{ color: C.green, fontSize: 12, marginLeft: 32, marginTop: 4 }}>
                    Locked to Pre-Order
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <TextInput
                  style={[s.input, { marginBottom: 12 }]}
                  placeholder="Search by Name, NIC, or Phone..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {saleType === 'DIRECT' && (
                  <TouchableOpacity
                    style={[s.optionCard, selectedCustomerId === null && s.optionSelected]}
                    onPress={() => setSelectedCustomerId(null)}
                  >
                    <Text style={{ fontSize: 16 }}>🏃 </Text>
                    <Text style={[s.optionText, selectedCustomerId === null && { color: C.amber }]}>Walk-in Customer</Text>
                  </TouchableOpacity>
                )}

                {displayCustomers.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.optionCard, selectedCustomerId === c.id && s.optionSelected]}
                    onPress={() => setSelectedCustomerId(c.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 16 }}>👤 </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[s.optionText, selectedCustomerId === c.id && { color: C.amber }]}>{c.name}</Text>
                          {c.rating != null && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: 'rgba(217, 119, 6, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, marginRight: 2, color: C.amber }}>★</Text>
                              <Text style={{ color: C.amber, fontSize: 10, fontWeight: 'bold' }}>{Number(c.rating).toFixed(1)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={{ color: '#6B7280', fontSize: 12, marginLeft: 32, marginTop: 4 }}>
                        {c.nic ? `NIC: ${c.nic}` : 'No NIC'} • {c.phone ? c.phone : 'No Phone'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity style={s.addNewBtn} onPress={() => { Keyboard.dismiss(); router.push('/(pos)/customer-create'); }}>
                  <Text style={s.addNewBtnText}>+ Create New Customer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {step === 3 && saleType === 'DIRECT' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 }}>
              <Text style={{ color: C.amber, fontSize: 16, fontWeight: '700' }}>Step 3 of 3</Text>
              <Text style={{ color: C.gray, fontSize: 14 }}>Invoice Review</Text>
            </View>

            <View style={{ gap: 20, marginTop: 10 }}>
              <View style={{ padding: 16, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder }}>
                <Text style={{ color: C.gray, fontSize: 14, marginBottom: 8 }}>Direct Sale Summary</Text>
                <Text style={{ color: C.white, fontSize: 15 }}>No downpayment or signatures required for direct sales.</Text>
                {preOrderId && <Text style={{ color: '#0EA5E9', fontSize: 14, marginTop: 8 }}>Booking deposit of Rs. {bookingDeposit.toLocaleString()} will be automatically applied.</Text>}
              </View>
              {renderCartSnapshot()}
            </View>
          </View>
        )}

        {step === 3 && saleType === 'INSTALLMENT' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 }}>
              <Text style={{ color: C.amber, fontSize: 16, fontWeight: '700' }}>Step 3 of 5</Text>
              <Text style={{ color: C.gray, fontSize: 14 }}>Financials & Schemes</Text>
            </View>

            <Text style={s.sectionTitle}>INSTALLMENT SCHEME</Text>
            <Text style={{ color: C.gray, fontSize: 13, marginBottom: 8 }}>Select Installment Scheme *</Text>
            {schemeList.length === 0 && <Text style={{ color: C.red, marginBottom: 10 }}>No schemes found</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {schemeList.map(scheme => (
                <TouchableOpacity
                  key={scheme.id}
                  style={[s.promoChip, selectedSchemeId === scheme.id && s.promoChipActive]}
                  onPress={() => setSelectedSchemeId(scheme.id)}
                >
                  <Text style={[s.promoText, selectedSchemeId === scheme.id && { color: C.amber }]}>
                    {scheme.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {preOrderId ? (
              <>
                <Text style={{ color: '#0EA5E9', fontSize: 13, marginBottom: 6 }}>Pre-order Deposit Applied: Rs. {bookingDeposit.toLocaleString()}</Text>
                <Text style={{ color: C.amber, fontSize: 13, marginBottom: 16 }}>
                  Remaining Downpayment Gap: Rs. {minGap.toLocaleString()}
                </Text>
                <TextInput
                  style={s.input}
                  placeholder={`Extra Cash Paid (Max: Rs. ${maxExtraCash.toLocaleString()})`}
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={extraCashStr}
                  onChangeText={setExtraCashStr}
                />
              </>
            ) : (
              <>
                <Text style={{ color: C.amber, fontSize: 13, marginBottom: 6 }}>
                  Minimum Required: Rs. {minDownpayment.toLocaleString()}
                </Text>
                <TextInput
                  style={s.input}
                  placeholder={`Downpayment Paid * (Min: Rs. ${minDownpayment.toLocaleString()})`}
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={downpaymentStr}
                  onChangeText={setDownpaymentStr}
                />
              </>
            )}

            {((!preOrderId && downpaymentInput >= finalTotal) || (preOrderId && extraCashPaid >= finalTotal)) && (
              <View style={{ marginTop: 10, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: C.red, fontSize: 14, fontWeight: '700' }}>
                    ⚠️ Overpayment Warning
                  </Text>
                </View>
                <Text style={{ color: C.gray, fontSize: 12, lineHeight: 18 }}>
                  {preOrderId 
                    ? `Extra cash paid (Rs. ${extraCashPaid.toLocaleString()}) cannot equal or exceed the remaining balance of Rs. ${finalTotal.toLocaleString()}. If the customer is paying in full, please select Direct / Cash mode.`
                    : `Downpayment paid (Rs. ${downpaymentInput.toLocaleString()}) cannot equal or exceed the total bill of Rs. ${finalTotal.toLocaleString()}. If the customer is paying in full, please select Direct / Cash mode.`
                  }
                </Text>
              </View>
            )}

            {((!preOrderId && downpaymentInput < minDownpayment) || (preOrderId && extraCashPaid < minGap)) && (
              <View style={{ marginTop: 10, padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: C.red, fontSize: 14, fontWeight: '700' }}>
                    Downpayment Shortfall
                  </Text>
                  <Text style={{ color: C.red, fontSize: 14, fontWeight: '800' }}>
                    Rs. {(!preOrderId ? (minDownpayment - downpaymentInput) : (minGap - extraCashPaid)).toFixed(2)}
                  </Text>
                </View>
                <Text style={{ color: C.gray, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  When will the customer pay this gap? *
                </Text>
                <TouchableOpacity 
                  style={{ padding: 12, backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: '#333' }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: C.white }}>{recoveryDateStr || 'Select Date...'}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={recoveryDateStr ? new Date(recoveryDateStr) : new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    maximumDate={new Date(new Date().setDate(new Date().getDate() + maxRecoveryDays))}
                    onValueChange={onDateChange}
                    onDismiss={() => setShowDatePicker(false)}
                  />
                )}
              </View>
            )}

            {selectedSchemeId && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, color: C.gray, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 }}>Installment Simulation</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.amber }}>
                  Rs. {calculateInstallment().toFixed(2)} X {schemeList.find(s => s.id === selectedSchemeId)?.terms} {schemeList.find(s => s.id === selectedSchemeId)?.frequency}s
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 4 && saleType === 'INSTALLMENT' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 }}>
              <Text style={{ color: C.amber, fontSize: 16, fontWeight: '700' }}>Step 4 of 5</Text>
              <Text style={{ color: C.gray, fontSize: 14 }}>Guarantor Info</Text>
            </View>

            <Text style={s.sectionTitle}>GUARANTOR DETAILS</Text>
            <TextInput style={s.input} placeholder="Full Name *" placeholderTextColor="#666" value={gName} onChangeText={setGName} />
            <TextInput style={s.input} placeholder="NIC Number *" placeholderTextColor="#666" value={gNic} onChangeText={setGNic} />
            <TextInput style={s.input} placeholder="Mobile Number *" placeholderTextColor="#666" keyboardType="phone-pad" value={gPhone} onChangeText={setGPhone} />
            <TextInput style={s.input} placeholder="Residential Address *" placeholderTextColor="#666" value={gAddress} onChangeText={setGAddress} />
            
            <Text style={s.sectionTitle}>GUARANTOR NIC PHOTOS</Text>
            <View style={s.nicRow}>
              {gNicFront ? (
                <View style={s.nicCard}>
                  <Image source={{ uri: gNicFront }} style={s.nicImage} />
                  <TouchableOpacity style={s.removeImageBtn} onPress={() => setGNicFront(null)}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.nicCard} onPress={() => pickImage(setGNicFront)}>
                  <View style={s.nicPlaceholder}>
                    <Text style={{ fontSize: 28 }}>📷</Text>
                    <Text style={s.nicText}>NIC Front</Text>
                  </View>
                </TouchableOpacity>
              )}

              {gNicBack ? (
                <View style={s.nicCard}>
                  <Image source={{ uri: gNicBack }} style={s.nicImage} />
                  <TouchableOpacity style={s.removeImageBtn} onPress={() => setGNicBack(null)}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={s.nicCard} onPress={() => pickImage(setGNicBack)}>
                  <View style={s.nicPlaceholder}>
                    <Text style={{ fontSize: 28 }}>📷</Text>
                    <Text style={s.nicText}>NIC Back</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <Text style={s.sectionTitle}>GUARANTOR SIGNATURE</Text>
            <TouchableOpacity style={[s.sigBtn, { borderColor: gSignature ? C.green : C.violet }]} onPress={() => setGSigModal(true)}>
              {gSignature ? (
                <Text style={{ color: C.green, fontWeight: '700', fontSize: 15 }}>✅ Guarantor Signature Captured</Text>
              ) : (
                <Text style={{ color: C.violet, fontWeight: '700', fontSize: 15 }}>Tap to Capture Guarantor Signature</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && saleType === 'INSTALLMENT' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 10 }}>
              <Text style={{ color: C.amber, fontSize: 16, fontWeight: '700' }}>Step 5 of 5</Text>
              <Text style={{ color: C.gray, fontSize: 14 }}>Signatures & Review</Text>
            </View>

            <Text style={s.sectionTitle}>REVIEW REQUIRED</Text>
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 20 }}>
               <Text style={{ color: C.gray, fontSize: 14 }}>Total to Collect Now:</Text>
               <Text style={{ color: C.amber, fontSize: 28, fontWeight: '800', marginVertical: 8 }}>
                  Rs. {preOrderId ? extraCashPaid.toLocaleString() : downpaymentInput.toLocaleString()}
               </Text>
               <Text style={{ color: C.gray, fontSize: 13 }}>Remaining Balance will be structured into {schemeList.find(s => s.id === selectedSchemeId)?.name || 'installments'}.</Text>
            </View>

            {renderCartSnapshot()}

            <Text style={s.sectionTitle}>CUSTOMER SIGNATURE</Text>
            <TouchableOpacity style={[s.sigBtn, { marginBottom: 20, borderColor: signature ? C.green : C.violet }]} onPress={() => setSigModal(true)}>
              {signature ? (
                <Text style={{ color: C.green, fontWeight: '700', fontSize: 15 }}>✅ Customer Signature Captured</Text>
              ) : (
                <Text style={{ color: C.violet, fontWeight: '700', fontSize: 15 }}>Tap to Capture Customer Signature</Text>
              )}
            </TouchableOpacity>

            <Text style={s.sectionTitle}>CUSTOMER SUMMARY</Text>
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 20 }}>
              {(() => {
                const cust = selectedCustomerId ? customerList.find(c => c.id === selectedCustomerId) : null;
                if (cust) {
                  return (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>{cust.name}</Text>
                        {cust.rating != null && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: 'rgba(217, 119, 6, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, marginRight: 2, color: C.amber }}>★</Text>
                            <Text style={{ color: C.amber, fontSize: 10, fontWeight: 'bold' }}>{Number(cust.rating).toFixed(1)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: C.gray, fontSize: 14, marginTop: 4 }}>{cust.nic || 'No NIC'} • {cust.phone || 'No Phone'}</Text>
                    </>
                  );
                }
                return (
                  <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>Walk-in Customer</Text>
                );
              })()}
              {signature && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: C.gray, fontSize: 12, marginBottom: 4 }}>Signature:</Text>
                  <Image source={{ uri: signature }} style={{ height: 80, resizeMode: 'contain', backgroundColor: '#fff', borderRadius: 8 }} />
                </View>
              )}
            </View>

            <Text style={s.sectionTitle}>GUARANTOR SUMMARY</Text>
            <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 20 }}>
              <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>{gName || 'N/A'}</Text>
              <Text style={{ color: C.gray, fontSize: 14 }}>{gNic || 'N/A'} • {gPhone || 'N/A'}</Text>
              {gSignature && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: C.gray, fontSize: 12, marginBottom: 4 }}>Signature:</Text>
                  <Image source={{ uri: gSignature }} style={{ height: 80, resizeMode: 'contain', backgroundColor: '#fff', borderRadius: 8 }} />
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 180 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer (Navigation & Totals) */}
      <View style={s.footer}>
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: C.gray, fontSize: 13 }}>Gross Total (Cash Price)</Text>
            <Text style={{ color: C.white, fontSize: 13, fontWeight: '600' }}>Rs. {grossTotal.toLocaleString()}</Text>
          </View>
          {saleType === 'INSTALLMENT' && selectedScheme && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: C.amber, fontSize: 13, fontWeight: '600' }}>Total with Interest</Text>
              <Text style={{ color: C.amber, fontSize: 14, fontWeight: '700' }}>Rs. {totalWithInterest.toLocaleString()}</Text>
            </View>
          )}
          {preOrderId && bookingDeposit > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: C.gray, fontSize: 13 }}>Booking Deposit Applied</Text>
              <Text style={{ color: '#0EA5E9', fontSize: 13, fontWeight: '600' }}>- Rs. {bookingDeposit.toLocaleString()}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#222' }}>
            <Text style={{ color: C.gray, fontSize: 15, fontWeight: '600' }}>{getCollectLabel()}</Text>
            <Text style={{ color: C.amber, fontSize: 22, fontWeight: '800' }}>Rs. {getCollectAmount().toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
           {step > 1 && (
             <TouchableOpacity 
               style={[s.confirmBtn, { flex: 0.4, backgroundColor: '#333' }]} 
               onPress={() => {
                 Keyboard.dismiss();
                 setStep(step - 1);
               }}
             >
               <Text style={s.confirmBtnText}>Back</Text>
             </TouchableOpacity>
           )}

           {((saleType === 'DIRECT' && step === 3) || (saleType === 'INSTALLMENT' && step === 5)) ? (
             <TouchableOpacity 
               style={[s.confirmBtn, { flex: 1, backgroundColor: C.green, opacity: isSubmitting ? 0.7 : 1 }]} 
               onPress={() => {
                 Keyboard.dismiss();
                 confirmSale();
               }} 
               disabled={isSubmitting}
             >
               <Text style={s.confirmBtnText}>{isSubmitting ? 'Processing...' : 'Complete Sale'}</Text>
             </TouchableOpacity>
           ) : (
             <TouchableOpacity 
               style={[s.confirmBtn, { flex: 1, backgroundColor: C.amber }]} 
               onPress={() => {
                 Keyboard.dismiss();
                 if (step === 1) {
                   setStep(2);
                 } else if (step === 2) {
                   if (saleType === 'INSTALLMENT' && selectedCustomerId === null) {
                     Alert.alert('Not Allowed', 'Installment sales cannot be made for Walk-in customers. Please select or create a registered customer.');
                     return;
                   }
                   setStep(3);
                 } else if (step === 3) {
                   if (saleType === 'INSTALLMENT') {
                      if (!selectedSchemeId) return Alert.alert('Required', 'Please select an installment scheme.');
                      if (preOrderId) {
                        if (extraCashPaid >= finalTotal) {
                          Alert.alert('Invalid Amount', `Extra cash paid (Rs. ${extraCashPaid.toLocaleString()}) cannot equal or exceed the remaining balance of Rs. ${finalTotal.toLocaleString()}. If paying in full, please use Cash / Direct mode.`);
                          return;
                        }
                      } else {
                        if (downpaymentInput >= finalTotal) {
                          Alert.alert('Invalid Amount', `Downpayment (Rs. ${downpaymentInput.toLocaleString()}) cannot equal or exceed the total bill of Rs. ${finalTotal.toLocaleString()}. If paying in full, please use Cash / Direct mode.`);
                          return;
                        }
                      }
                      setStep(4);
                   }
                 } else if (step === 4) {
                   if (saleType === 'INSTALLMENT') {
                     if (!gName || !gNic || !gPhone || !gAddress || !gNicFront || !gNicBack || !gSignature) {
                       return Alert.alert('Required', 'Please fill all guarantor details (including address), upload both NIC photos, and capture the guarantor signature.');
                     }

                     const nicRegex = /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/;
                     if (!nicRegex.test(gNic)) {
                       return Alert.alert('Invalid NIC', 'Please enter a valid Sri Lankan NIC (9 digits + V/X or 12 digits) for the guarantor.');
                     }

                     const phoneRegex = /^0[0-9]{9}$/;
                     if (!phoneRegex.test(gPhone)) {
                       return Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number starting with 0 for the guarantor.');
                     }

                     setStep(5);
                   }
                }
               }}
             >
               <Text style={[s.confirmBtnText, { color: '#000' }]}>Next Step</Text>
             </TouchableOpacity>
           )}
        </View>
      </View>

      {/* Customer Signature Modal */}
      {sigModal && (
        <Modal visible={true} animationType="fade" onRequestClose={() => setSigModal(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
              <TouchableOpacity onPress={() => setSigModal(false)}><Text style={{ color: C.red, fontWeight: '700', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => sigRef.current?.clearSignature()}><Text style={{ color: '#666', fontWeight: '700', fontSize: 16 }}>Clear</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => sigRef.current?.readSignature()}><Text style={{ color: C.green, fontWeight: '800', fontSize: 16 }}>Save</Text></TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <SignatureScreen key="customer-sig" ref={sigRef} onOK={handleSignature} onEmpty={() => Alert.alert('Empty', 'Please sign the document')} descriptionText="Customer Sign Here" clearText="Clear" confirmText="Save" backgroundColor="#ffffff" penColor="#000000" webStyle={`.m-signature-pad--footer { display: flex; justify-content: space-between; padding: 10px; }`} />
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Guarantor Signature Modal */}
      {gSigModal && (
        <Modal visible={true} animationType="fade" onRequestClose={() => setGSigModal(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
              <TouchableOpacity onPress={() => setGSigModal(false)}><Text style={{ color: C.red, fontWeight: '700', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => gSigRef.current?.clearSignature()}><Text style={{ color: '#666', fontWeight: '700', fontSize: 16 }}>Clear</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => gSigRef.current?.readSignature()}><Text style={{ color: C.green, fontWeight: '800', fontSize: 16 }}>Save</Text></TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <SignatureScreen key="guarantor-sig" ref={gSigRef} onOK={handleGSignature} onEmpty={() => Alert.alert('Empty', 'Please sign the document')} descriptionText="Guarantor Sign Here" clearText="Clear" confirmText="Save" backgroundColor="#ffffff" penColor="#000000" webStyle={`.m-signature-pad--footer { display: flex; justify-content: space-between; padding: 10px; }`} />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.white, fontSize: 20, fontWeight: '800' },

  sectionTitle: {
    color: '#6B7280', fontSize: 12, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 10,
  },

  optionCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: C.cardBorder, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  optionSelected: { borderColor: C.amber, backgroundColor: C.amberDim },
  optionText: { color: C.gray, fontSize: 15, fontWeight: '600' },

  addNewBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', marginTop: 4,
  },
  addNewBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: C.cardBorder, gap: 6,
  },
  typeBtnActive: { borderColor: C.amber, backgroundColor: C.amberDim },
  typeText: { color: C.gray, fontWeight: '700', fontSize: 13 },

  nicRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  nicCard: {
    flex: 1, height: 130, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.card,
  },
  nicImage: { width: '100%', height: '100%' },
  nicPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  nicText: { color: C.gray, fontSize: 13, fontWeight: '600' },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333'
  },

  guarantorBox: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: C.violet,
  },
  guarantorTitle: { color: C.violet, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  input: {
    backgroundColor: '#1A1A1A', color: C.white, padding: 14, borderRadius: 12,
    marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder, fontSize: 15,
  },
  sigBtn: {
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: C.violet, borderStyle: 'dashed',
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.cardBorder, paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28,
  },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subLabel: { color: C.green, fontSize: 14 },
  subValue: { color: C.green, fontSize: 14, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 4 },
  totalLabel: { color: C.gray, fontSize: 16 },
  totalValue: { color: C.amber, fontSize: 24, fontWeight: '800' },
  confirmBtn: {
    backgroundColor: C.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  confirmBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
  promoChip: {
    backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: C.cardBorder, marginRight: 8,
  },
  promoChipActive: { borderColor: C.amber, backgroundColor: C.amberDim },
  promoText: { color: C.gray, fontSize: 13, fontWeight: '700' },
});
