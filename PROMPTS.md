I am building a AI hobby tracker with a mystical/magic style webapp using Vite + React + Hono + Cloudflare, Currently I have the template stuff imported and want to get started with the project. I want to replace the template filler with a very basic layout to get started.

We are probably going to want the following pages for our webapp, dashboard/home, hobbies, items, add, discover, activity, settings. Can you implement the basic templates of these pages?

Can you explain to me how wrangler works and what DB options Cloudflare offers in context of our app. Then walk me through what we need to do to create the login/register workflow. 

Ok now that we have basic auth and a database set up, I need to set up the backend so I can add hobbies and items and have it autocategorize my stuff and find relations between my hobbies/items for recommendations. I'm thinking that we definitely need a way to vectorize all the items and probably need a model for this part. Does cloudflare offer us anyway to do this?

Cloudflare's Vectorize and Vite seem to be in conflict and causing my local development to not function with the VECTORIZE binding. What are some possible reasons this might be the case and are there any work arounds?

We need to implement the rest of the CRUD operations to allow for editing and deleting of hobbies and items, can you help me figure out what methods frmo the Cloudflare documentation we would need to implement these and create a simple frontend UI for these features?

To add a failsafe to the AI categorization, can you add onto the UI to allow for the new manual categorty selection we implemented in the backend? This should be a dropdown. 

I want to exapand our capabilities of adding items by also allowing an image of an item to be uploaded or taken. We want our user to be able to go to add an item, upload or take a photo of the item, and then have some AI try to come up with a name, description, and category optionally from the image, unless the user manually enters these two fields. Does our current Cloudflare database support images and how does accessing phone/computer camera work?

Can you explain to me how semantic search works in the context of our webapp so far as well as create a basic frontend ui for testing? My goal is to have it allow us to search through all the items in our hobbies that we have added. What should I know about the Cloudflare vectorize index to do this?

It seems like my vector database is missing metadata and failing the query, can you explain to me what parameters the vector database expects and why we would be failing to have them? Can you also help me implement some debugging tools and a way to revectorize just in case that is the problem?

