/**
 * Payment Routes
 * Handles deposit requests and payment status checks
 */

const express = require('express');
const router = express.Router();
const { initiatePayment } = require('../services/paymentService.js');
const supabase = require('../services/database.js');
const paymentCache = require('../services/paymentCache.js');

/**
 * Handle payment timeout - mark as failed if no callback after 10 seconds
 */
async function handlePaymentTimeout(externalReference, checkoutRequestId, paymentData) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        console.log(`\n⏰ [TIMEOUT CHECK] Checking payment: ${externalReference}`);
        
        // Check if payment is still PENDING (no callback received)
        let currentPaymentStatus = 'PENDING';
        
        // Try to get from database first
        try {
          const { data, error } = await supabase
            .from('payments')
            .select('status')
            .eq('external_reference', externalReference)
            .single();
          
          if (!error && data) {
            currentPaymentStatus = data.status;
          }
        } catch (dbError) {
          console.warn('⚠️ Timeout check DB error:', dbError.message);
          // Fall back to cache
          const cachedPayment = paymentCache.getPayment(externalReference);
          if (cachedPayment) {
            currentPaymentStatus = cachedPayment.status;
          }
        }

        if (currentPaymentStatus === 'PENDING') {
          console.log(`❌ [TIMEOUT] Payment still PENDING after 10 seconds: ${externalReference}`);
          
          // Mark payment as FAILED
          try {
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                status: 'FAILED',
                result_code: 'TIMEOUT',
                result_desc: 'No callback received within 10 seconds',
                updated_at: new Date().toISOString()
              })
              .eq('external_reference', externalReference);

            if (updateError) {
              console.warn('⚠️ Failed to update payment status:', updateError.message);
            } else {
              console.log('✅ Payment marked as FAILED in database');
            }
          } catch (dbError) {
            console.warn('⚠️ Database error marking payment as failed:', dbError.message);
          }

          // Update cache
          const cachedPayment = paymentCache.getPayment(externalReference);
          if (cachedPayment) {
            cachedPayment.status = 'FAILED';
            cachedPayment.result_code = 'TIMEOUT';
            cachedPayment.result_desc = 'No callback received within 10 seconds';
            console.log('✅ Cache updated: Payment marked as FAILED');
          }

          // Record failed transaction
          try {
            const { error: transactionError } = await supabase
              .from('transactions')
              .insert({
                user_id: paymentData.user_id,
                type: 'deposit',
                amount: parseFloat(paymentData.amount),
                status: 'failed',
                mpesa_receipt: '',
                external_reference: externalReference,
                reason: 'Timeout - No callback received within 10 seconds',
                date: new Date().toISOString()
              });

            if (transactionError) {
              console.warn('⚠️ Failed to record transaction:', transactionError.message);
            } else {
              console.log('✅ Failed transaction recorded');
            }
          } catch (dbError) {
            console.warn('⚠️ Database error recording failed transaction:', dbError.message);
          }

          console.log(`✅ [TIMEOUT] Timeout handling completed for: ${externalReference}\n`);
        } else {
          console.log(`✅ [TIMEOUT CHECK] Payment ${externalReference} has status: ${currentPaymentStatus} - No timeout needed\n`);
        }
        
        resolve();
      } catch (error) {
        console.error('❌ [TIMEOUT] Error in timeout handler:', error);
        resolve();
      }
    }, 10000); // 10 seconds
  });
}

/**
 * POST /api/payments/initiate
 * Initiate a new payment
 */
router.post('/initiate', async (req, res) => {
  try {
    const { amount, phoneNumber, userId } = req.body;

    console.log('📋 Payment Initiation Request:', { amount, phoneNumber, userId });

    // Validation
    if (!amount || !phoneNumber || !userId) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Amount, phone number, and user ID are required'
      });
    }

    const numAmount = parseFloat(amount);
    if (numAmount < 1) {
      console.log('❌ Validation failed: Amount too low');
      return res.status(400).json({
        success: false,
        message: 'Minimum deposit amount is KSH 1'
      });
    }

    // Generate reference
    const externalReference = `DEP-${Date.now()}-${userId}`;
    const callbackUrl = `${process.env.CALLBACK_URL || 'http://localhost:5000'}/api/callbacks/payhero`;

    console.log('🔄 Initiating payment with PayHero...');
    console.log('📞 Phone:', phoneNumber);
    console.log('💰 Amount:', numAmount);
    console.log('📝 Reference:', externalReference);

    // DEVELOPMENT MODE: Use mock payment for testing
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment && process.env.USE_MOCK_PAYMENTS === 'true') {
      console.log('🧪 [DEV MODE] Using mock payment processing...');
      console.log('✅ Mock STK Push would be sent to:', phoneNumber);
      
      const mockCheckoutRequestId = `MOCK-${Date.now()}`;
      
      // Store in cache for status checks
      paymentCache.storePayment(externalReference, mockCheckoutRequestId, {
        status: 'PENDING',
        amount: numAmount,
        phone_number: phoneNumber,
        user_id: userId,
        created_at: new Date().toISOString()
      });
      // Do NOT auto-complete - wait for actual PayHero callback
      
      return res.status(200).json({
        success: true,
        data: {
          CheckoutRequestID: mockCheckoutRequestId,
          merchant_request_id: mockCheckoutRequestId,
          response_code: '0',
          response_description: 'Success. Request accepted for processing',
          customer_message: 'Success. Request accepted for processing',
          externalReference: externalReference
        },
        externalReference: externalReference,
        statusCode: 200,
        isMockPayment: true
      });
    }

    // Initiate payment with PayHero
    let paymentResult;
    try {
      paymentResult = await initiatePayment(
        numAmount,
        phoneNumber,
        externalReference,
        callbackUrl
      );
    } catch (paymentError) {
      console.error('❌ PayHero API Error:', paymentError);
      
      // Fallback to mock payment in development if real API fails
      if (isDevelopment) {
        console.log('🔄 Falling back to mock payment...');
        const mockCheckoutRequestId = `MOCK-${Date.now()}`;
        
        // Store in cache for status checks
        paymentCache.storePayment(externalReference, mockCheckoutRequestId, {
          status: 'PENDING',
          amount: numAmount,
          phone_number: phoneNumber,
          user_id: userId,
          created_at: new Date().toISOString()
        });
        // Do NOT auto-complete - wait for actual PayHero callback
        
        return res.status(200).json({
          success: true,
          data: {
            CheckoutRequestID: mockCheckoutRequestId,
            merchant_request_id: mockCheckoutRequestId,
            response_code: '0',
            response_description: 'Success. Request accepted for processing',
            customer_message: 'Success. Request accepted for processing',
            externalReference: externalReference
          },
          externalReference: externalReference,
          statusCode: 200,
          isMockPayment: true
        });
      }
      
      return res.status(400).json({
        success: false,
        message: paymentError.message || 'Failed to initiate payment with PayHero',
        details: paymentError.error || paymentError
      });
    }

    if (!paymentResult.success) {
      console.error('❌ PayHero returned error:', paymentResult);
      return res.status(400).json(paymentResult);
    }

    const checkoutRequestId = paymentResult.data.CheckoutRequestID;
    console.log('✅ STK push initiated. CheckoutRequestID:', checkoutRequestId);

    // Store payment record in database and cache (non-blocking)
    try {
      const paymentData = {
        user_id: userId,
        amount: numAmount,
        phone_number: phoneNumber,
        external_reference: externalReference,
        checkout_request_id: checkoutRequestId,
        status: 'PENDING'
      };

      const { error } = await supabase
        .from('payments')
        .insert(paymentData);

      if (error) {
        console.warn('⚠️ Database Storage Warning:', error.message);
        // Don't fail the payment initiation if DB storage fails
        // The payment was already sent to PayHero
      } else {
        console.log('✅ Payment record stored in database');
      }

      // Always cache the payment for fallback
      paymentCache.storePayment(externalReference, checkoutRequestId, paymentData);
      console.log('✅ Payment cached for fallback');

    } catch (dbError) {
      console.warn('⚠️ Database Error (non-blocking):', dbError.message);
      // Cache the payment even if DB fails
      try {
        const paymentData = {
          user_id: userId,
          amount: numAmount,
          phone_number: phoneNumber,
          external_reference: externalReference,
          checkout_request_id: checkoutRequestId,
          status: 'PENDING'
        };
        paymentCache.storePayment(externalReference, checkoutRequestId, paymentData);
        console.log('✅ Payment cached as fallback (DB error)');
      } catch (cacheError) {
        console.warn('⚠️ Cache Error:', cacheError.message);
      }
      // Continue - the payment was already initiated with PayHero
    }

    console.log('✅ Payment initiation completed successfully');
    
    // Prepare payment data for timeout handler
    const paymentDataForTimeout = {
      user_id: userId,
      amount: numAmount,
      phone_number: phoneNumber,
      external_reference: externalReference,
      checkout_request_id: checkoutRequestId,
      status: 'PENDING'
    };

    // Send response immediately
    res.json({
      success: true,
      message: 'Payment initiated successfully. STK push sent to your phone.',
      data: {
        externalReference,
        checkoutRequestId,
        amount: numAmount,
        phone: phoneNumber
      }
    });

    // Start timeout handler in background (non-blocking)
    handlePaymentTimeout(externalReference, checkoutRequestId, paymentDataForTimeout)
      .catch(err => console.error('❌ Error in background timeout handler:', err));


  } catch (error) {
    console.error('❌ Payment Initiation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initiation failed',
      error: error.message
    });
  }
});

/**
 * GET /api/payments/status/:externalReference
 * Check payment status
 */
router.get('/status/:externalReference', async (req, res) => {
  try {
    const { externalReference } = req.params;

    console.log('🔍 Checking payment status:', externalReference);

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('external_reference', externalReference)
        .single();

      if (error) {
        console.warn('⚠️ Payment not found in database, checking cache:', externalReference);
        
        // Try cache as fallback
        const cachedPayment = paymentCache.getPayment(externalReference);
        if (cachedPayment) {
          console.log('✅ Payment found in cache:', cachedPayment.status);
          return res.json({
            success: true,
            payment: cachedPayment,
            cached: true
          });
        }

        // Return pending status if not found (might be in-flight from PayHero)
        return res.json({
          success: true,
          payment: {
            status: 'Pending',
            message: 'Payment status not yet available. Please wait...'
          }
        });
      }

      console.log('✅ Payment found in database:', data.status);
      res.json({
        success: true,
        payment: data
      });
    } catch (dbError) {
      console.warn('⚠️ Database query error, checking cache:', dbError.message);
      
      // Try cache as fallback when DB fails
      const cachedPayment = paymentCache.getPayment(externalReference);
      if (cachedPayment) {
        console.log('✅ Payment found in cache (DB unavailable):', cachedPayment.status);
        return res.json({
          success: true,
          payment: cachedPayment,
          cached: true,
          message: 'Retrieved from cache due to database unavailability'
        });
      }

      // Return pending if database is unavailable and no cache
      return res.json({
        success: true,
        payment: {
          status: 'Pending',
          message: 'Payment status pending. Please try again shortly.'
        }
      });
    }

  } catch (error) {
    console.error('❌ Status Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
});

/**
 * GET /api/payments/admin/failed
 * Admin endpoint - Get all failed payments
 */
router.get('/admin/failed', async (req, res) => {
  try {
    console.log('📋 Admin fetching failed payments...');

    // Try to get from database
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'FAILED')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Database error fetching failed payments:', error.message);
        return res.json({
          success: true,
          payments: [],
          message: 'No failed payments found (database unavailable)'
        });
      }

      console.log(`✅ Found ${data.length} failed payments`);
      res.json({
        success: true,
        payments: data || [],
        count: (data || []).length
      });
    } catch (dbError) {
      console.warn('⚠️ Database connection error:', dbError.message);
      // Return cached failed payments
      const cachedPayments = paymentCache.getAllPayments()
        .filter(p => p.status === 'FAILED');
      
      res.json({
        success: true,
        payments: cachedPayments,
        count: cachedPayments.length,
        message: 'Retrieved from cache (database unavailable)'
      });
    }
  } catch (error) {
    console.error('❌ Admin Failed Payments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failed payments',
      error: error.message
    });
  }
});

/**
 * POST /api/payments/admin/resolve/:externalReference
 * Admin endpoint - Mark failed payment as success and update user balance
 */
router.post('/admin/resolve/:externalReference', async (req, res) => {
  try {
    const { externalReference } = req.params;
    const { mpesaReceipt, resultDesc } = req.body;

    console.log(`\n💼 Admin resolving payment: ${externalReference}`);

    // Get payment details
    let paymentData = null;
    let isFromCache = false;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('external_reference', externalReference)
        .single();

      if (!error && data) {
        paymentData = data;
        console.log('✅ Payment found in database');
      } else {
        console.warn('⚠️ Payment not in database, checking cache');
        paymentData = paymentCache.getPayment(externalReference);
        if (paymentData) {
          isFromCache = true;
          console.log('✅ Payment found in cache');
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database error:', dbError.message);
      paymentData = paymentCache.getPayment(externalReference);
      if (paymentData) {
        isFromCache = true;
        console.log('✅ Payment found in cache (DB unavailable)');
      }
    }

    if (!paymentData) {
      console.warn('⚠️ Payment not found:', externalReference);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const { user_id, amount } = paymentData;

    // Update payment status to success
    console.log('\n📝 Updating payment status to SUCCESS...');
    if (!isFromCache) {
      try {
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'Success',
            result_code: 0,
            result_desc: resultDesc || 'Admin resolved - Marked as success',
            mpesa_receipt_number: mpesaReceipt || 'ADMIN-RESOLVED',
            updated_at: new Date().toISOString()
          })
          .eq('external_reference', externalReference);

        if (updateError) {
          console.warn('⚠️ Failed to update payment status:', updateError.message);
        } else {
          console.log('✅ Payment marked as SUCCESS in database');
        }
      } catch (dbError) {
        console.warn('⚠️ Database error updating payment:', dbError.message);
      }
    }

    // Update cache
    const cachedPayment = paymentCache.getPayment(externalReference);
    if (cachedPayment) {
      cachedPayment.status = 'Success';
      cachedPayment.result_code = 0;
      cachedPayment.result_desc = resultDesc || 'Admin resolved - Marked as success';
      cachedPayment.mpesa_receipt_number = mpesaReceipt || 'ADMIN-RESOLVED';
      console.log('✅ Cache updated: Payment marked as SUCCESS');
    }

    // Update user balance
    console.log('\n💰 Updating user balance...');
    if (!isFromCache) {
      try {
        // Get current balance
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('account_balance')
          .eq('id', user_id)
          .single();

        if (!userError && userData) {
          const newBalance = (parseFloat(userData.account_balance) || 0) + parseFloat(amount);

          const { error: balanceError } = await supabase
            .from('users')
            .update({ account_balance: newBalance })
            .eq('id', user_id);

          if (balanceError) {
            console.error('❌ Failed to update balance:', balanceError.message);
            return res.status(500).json({
              success: false,
              message: 'Payment marked as success but failed to update balance',
              error: balanceError.message
            });
          } else {
            console.log(`✅ Balance updated. New balance: ${newBalance}`);
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Database error updating balance:', dbError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to update user balance',
          error: dbError.message
        });
      }
    } else {
      console.log('✅ Balance update noted (database unavailable)');
    }

    // Record successful transaction
    console.log('\n📊 Recording resolved transaction...');
    if (!isFromCache) {
      try {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id,
            type: 'deposit',
            amount: parseFloat(amount),
            status: 'completed',
            mpesa_receipt: mpesaReceipt || 'ADMIN-RESOLVED',
            external_reference: externalReference,
            notes: 'Admin resolved - Failed payment marked as success',
            date: new Date().toISOString()
          });

        if (transactionError) {
          console.warn('⚠️ Failed to record transaction:', transactionError.message);
          // Still return success since balance was updated
        } else {
          console.log('✅ Transaction recorded');
        }
      } catch (dbError) {
        console.warn('⚠️ Database error recording transaction:', dbError.message);
      }
    } else {
      console.log('✅ Transaction record noted (database unavailable)');
    }

    console.log(`\n✅ Payment resolved successfully: ${externalReference}\n`);

    res.json({
      success: true,
      message: 'Payment marked as success and balance updated',
      payment: paymentData,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Payment Resolution Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve payment',
      error: error.message
    });
  }
});

/**
 * GET /api/payments/user-balance/:userId
 * Get user's current account balance from database
 */
router.get('/user-balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('💰 Fetching user balance:', userId);

    // Fetch from database
    try {
      const { data, error } = await supabase
        .from('users')
        .select('account_balance')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('⚠️ User not found in database:', error.message);
        return res.json({
          success: true,
          balance: null,
          message: 'User balance not found. Using default balance.'
        });
      }

      const accountBalance = parseFloat(data.account_balance) || 0;
      console.log('✅ User balance fetched:', accountBalance);

      res.json({
        success: true,
        balance: accountBalance,
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.warn('⚠️ Database error fetching balance:', dbError.message);
      res.json({
        success: true,
        balance: null,
        message: 'Database unavailable. Using cached balance.'
      });
    }
  } catch (error) {
    console.error('❌ Balance Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user balance',
      error: error.message
    });
  }
});

/**
 * PUT /api/payments/admin/update-balance/:userId
 * Admin endpoint - Update user's account balance
 */
router.put('/admin/update-balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newBalance, reason } = req.body;

    if (typeof newBalance !== 'number' || newBalance < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid balance amount'
      });
    }

    console.log(`\n💼 Admin updating balance for user: ${userId}`);
    console.log(`   New Balance: ${newBalance}, Reason: ${reason}`);

    // Get current balance for the transaction record
    let previousBalance = 0;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('account_balance')
        .eq('id', userId)
        .single();

      if (!error && data) {
        previousBalance = parseFloat(data.account_balance) || 0;
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch previous balance:', err.message);
    }

    // Update balance in database
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ account_balance: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Failed to update balance:', updateError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to update balance',
          error: updateError.message
        });
      }

      console.log(`✅ Balance updated. Previous: ${previousBalance}, New: ${newBalance}`);
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: dbError.message
      });
    }

    // Record admin transaction
    try {
      const balanceDiff = newBalance - previousBalance;
      const transactionType = balanceDiff > 0 ? 'admin_credit' : 'admin_debit';

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: transactionType,
          amount: Math.abs(balanceDiff),
          status: 'completed',
          external_reference: `ADMIN-${Date.now()}`,
          notes: reason || 'Admin balance adjustment',
          date: new Date().toISOString()
        });

      if (transactionError) {
        console.warn('⚠️ Failed to record admin transaction:', transactionError.message);
      } else {
        console.log('✅ Admin transaction recorded');
      }
    } catch (transactionError) {
      console.warn('⚠️ Transaction error:', transactionError.message);
    }

    console.log(`\n✅ Balance update completed for user ${userId}\n`);

    res.json({
      success: true,
      message: 'Balance updated successfully',
      userId,
      previousBalance,
      newBalance,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Admin Balance Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user balance',
      error: error.message
    });
  }
});

/**
 * POST /api/payments/admin/complete/:externalReference
 * Admin endpoint - Complete a pending payment manually (for testing)
 */
router.post('/admin/complete/:externalReference', async (req, res) => {
  try {
    const { externalReference } = req.params;

    console.log('🔧 Admin attempting to complete payment:', externalReference);

    // Get from cache first
    let payment = paymentCache.getPayment(externalReference);
    
    if (!payment) {
      // Try database
      try {
        const { data } = await supabase
          .from('payments')
          .select('*')
          .eq('external_reference', externalReference)
          .single();
        
        if (data) {
          payment = data;
        }
      } catch (dbError) {
        console.warn('⚠️ Payment not found in database');
      }
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update status to Success
    const updatedPayment = {
      ...payment,
      status: 'Success',
      result_code: '0',
      result_desc: 'Payment completed by admin',
      mpesa_receipt: `MCC${Date.now()}`, // Mock receipt number
      completed_at: new Date().toISOString()
    };

    // Update cache
    paymentCache.storePayment(externalReference, payment.CheckoutRequestID || payment.checkout_request_id, updatedPayment);

    // Try to update database
    try {
      await supabase
        .from('payments')
        .update({ 
          status: 'Success',
          result_code: '0',
          result_desc: 'Payment completed by admin',
          mpesa_receipt: updatedPayment.mpesa_receipt,
          updated_at: new Date().toISOString()
        })
        .eq('external_reference', externalReference);
    } catch (dbError) {
      console.warn('⚠️ Database update failed, using cache only:', dbError.message);
    }

    console.log('✅ Payment completed manually:', externalReference);

    res.json({
      success: true,
      message: 'Payment completed successfully',
      payment: updatedPayment
    });

  } catch (error) {
    console.error('❌ Admin Payment Completion Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete payment',
      error: error.message
    });
  }
});

/**
 * DELETE /api/payments/admin/users/:userId
 * Admin endpoint - Delete a user account permanently
 */
router.delete('/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🗑️ Admin attempting to delete user:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Try to delete from database
    let dbSuccess = false;
    try {
      // Delete user transactions first
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId);

      // Delete user payments
      await supabase
        .from('payments')
        .delete()
        .eq('user_id', userId);

      // Delete user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (!error) {
        dbSuccess = true;
        console.log('✅ User deleted from database:', userId);
      } else {
        console.warn('⚠️ Database deletion error:', error.message);
      }
    } catch (dbError) {
      console.warn('⚠️ Database error during user deletion:', dbError.message);
    }

    res.json({
      success: true,
      message: dbSuccess ? 'User deleted successfully' : 'User deletion initiated (database unavailable)',
      userId: userId,
      dbSuccess: dbSuccess
    });

  } catch (error) {
    console.error('❌ User Deletion Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

module.exports = router;
