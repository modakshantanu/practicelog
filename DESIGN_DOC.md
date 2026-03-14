
Task:
 - Create a simple web app used to track my piano practice sessions
 - The app should be a static web page that uses browser local storage as its database
 - The app should be a responsive interface, and pay special attention to how the app works on mobile. That will be the main interface by which I use it
 - The app should be in dark mode. No need to support theme customization, just one theme is ok. 
 - The app should let me record my piano practice sessions, it should contain the duration as well as a list of 
    Piece played / optional focus area. 
 - It should remember past choices of the pieces / focus area and suggest me to reuse those.

 - It should have an analytics page where I can see total time practiced during various intervals (e.g. past day, past 7 days )
  as well as the breakdown by piece and practice area

  Pieces would include example:
   - Chopin Winter Wind
   - Moonlight Sonata 3rd Mvt
   - Brahms Intermezzo Op 118 No 2
   - Scales (not really a piece but we categorise it as a "piece")

etc
 And focus areas could be stuff like
   - Slow practice
   - Memorization
   - Section B voicing.

As you can see, the focus area can include piece-specific stuff as well as general stuff that applies to all pieces.

So the first screen should let me record practice sessions in real time, as well as manually add.
For a practice session, the metadata is 
 - List of 
    - Piece
    - Focus area (optional)
    - Time practiced (optional)
 - Any other notes
 - Start time
 - Total practice duration

Feel free to suggest more things, especially if I forgot something obvious, but lets keep it as simple as possible.

then the second screen may be a list of past sessions, and I can edit and delete sessions, And support multi select operations as well

and the next screen should be a dashboard screen for statistics on how much ive been practicing and breakdown by piece, and for each piece, I should be able to see a breakdown by the focus areas. I should be able to select different time horizons for this analysis as well.


Implementation notes:
 - Focus on using the best tools for the job, if using a framework is better, dont try to hack everything with html and css
 - Focus on modularity and extensibility
 - Just write clean code in general. Do not repeat code blocks too often, instead make them into functions.

 