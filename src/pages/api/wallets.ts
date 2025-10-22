import type { APIRoute } from "astro";
import { CreateWalletSchema } from "../../lib/validation/wallet";
import { GetWalletsQuerySchema } from "../../lib/validation/getWallets";
import { 
	createWallet,
	getWallets,
	WalletValidationError,
	WalletDatabaseError 
} from "../../lib/services/walletService";

import { DEFAULT_USER_ID } from "../../db/supabase.client"
export const prerender = false;

/**
 * POST /api/wallets
 *
 * Creates a new wallet for the authenticated user, optionally with initial instruments.
 *
 * Request body:
 * - name (required): Wallet name
 * - goal_amount (required): Target amount in smallest currency unit
 * - target_date (required): ISO date string in the future
 * - description (optional): Wallet description
 * - instruments (optional): Array of initial instruments
 *
 * Returns:
 * - 201 Created: WalletWithInstrumentsDto
 * - 400 Bad Request: Invalid input data
 * - 401 Unauthorized: Missing or invalid authentication
 * - 422 Unprocessable Entity: Business rule violation (e.g., instruments sum mismatch)
 * - 500 Internal Server Error: Database or server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
	try {
		// Step 1: Extract Supabase client from middleware
		const supabase = locals.supabase;
		if (!supabase) {
			return new Response(
				JSON.stringify({ error: "Supabase client not available" }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// // Step 2: Check authentication
		// const {
		// 	data: { user },
		// 	error: authError,
		// } = await supabase.auth.getUser();

		// if (authError || !user) {
		// 	return new Response(
		// 		JSON.stringify({ error: "Unauthorized" }),
		// 		{ status: 401, headers: { "Content-Type": "application/json" } }
		// 	);
		// }

		// Step 3: Parse and validate request body
		let requestBody;
		try {
			requestBody = await request.json();
			console.log(requestBody)
		} catch (error) {
			return new Response(
				JSON.stringify({ error: "Invalid JSON in request body" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		const validationResult = CreateWalletSchema.safeParse(requestBody);

		if (!validationResult.success) {
			return new Response(
				JSON.stringify({
					error: "Validation failed",
					details: validationResult.error.issues.map((issue) => ({
						path: issue.path.join("."),
						message: issue.message,
					})),
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		const payload = validationResult.data;

		// Step 4: Build the CreateWalletCommand
		const command = {
			name: payload.name,
			goal_amount: payload.goal_amount,
			target_date: payload.target_date,
			description: payload.description,
			instruments: payload.instruments || [],
		};

		// Step 5: Call the service layer
		const wallet = await createWallet(supabase, command, DEFAULT_USER_ID);

		// Step 6: Return success response
		return new Response(JSON.stringify(wallet), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		// Handle business logic validation errors
		if (error instanceof WalletValidationError) {
			return new Response(
				JSON.stringify({ error: error.message }),
				{ status: 422, headers: { "Content-Type": "application/json" } }
			);
		}

		// Handle database errors
		if (error instanceof WalletDatabaseError) {
			console.error("Database error in POST /api/wallets:", error.message, error.cause);
			return new Response(
				JSON.stringify({ error: "Failed to save wallet data. Please try again." }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// Log unexpected errors server-side
		console.error("Unexpected error in POST /api/wallets:", error);

		// Return generic error message to client
		return new Response(
			JSON.stringify({ error: "An unexpected error occurred" }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};

/**
 * GET /api/wallets
 * 
 * Retrieves all wallets belonging to the authenticated user.
 * Supports optional sorting by name or target_date.
 * 
 * Query parameters:
 * - sortBy (optional): 'name' | 'target_date' (default: 'target_date')
 * - order (optional): 'asc' | 'desc' (default: 'asc')
 * 
 * Returns:
 * - 200 OK: Array of WalletDto objects
 * - 400 Bad Request: Invalid query parameters
 * - 401 Unauthorized: Missing or invalid authentication
 * - 500 Internal Server Error: Database or server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Extract Supabase client from middleware
    const supabase = locals.supabase;
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase client not available" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      sortBy: url.searchParams.get("sortBy") || undefined,
      order: url.searchParams.get("order") || undefined
    };
    
    const result = GetWalletsQuerySchema.safeParse(queryParams);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid query parameters", 
          details: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          }))
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Step 3: Call service to get wallets
    const wallets = await getWallets(
      supabase,
      DEFAULT_USER_ID,
      { 
        sortBy: result.data.sortBy, 
        order: result.data.order 
      }
    );
    
    // Step 4: Return successful response
    return new Response(
      JSON.stringify(wallets),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    // Handle business logic validation errors
    if (error instanceof WalletValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle database errors
    if (error instanceof WalletDatabaseError) {
      console.error("Database error in GET /api/wallets:", error.message, error.cause);
      return new Response(
        JSON.stringify({ error: "Server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Log unexpected errors server-side
    console.error("Unexpected error in GET /api/wallets:", error);
    
    // Return generic error message to client
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

