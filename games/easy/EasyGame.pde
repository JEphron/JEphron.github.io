

float dotSpacing = 10;
float dotRadius = 25;
float defaultTextSize = 24;
float currentTextSize = 24;
ArrayList<Column> columns = new ArrayList<Column>();
int score = 0;
class Column {
  ArrayList<Dot> dots = new ArrayList<Dot>();
  float x, y;
  Column(int rows, float x) {
    this.y = height/2 - rows*(dotRadius-dotSpacing);
    this.x=x;
    for (int i = 0; i < rows; i++) {
      dots.add( new Dot(x, y + i*(dotRadius+dotSpacing)));
    }
  }

  void display() {
    for (int i = 0; i < dots.size (); i++) {
      Dot d = dots.get(i);
      if (d.alive) {
        d.y = lerp(d.y, y + i*(dotRadius+dotSpacing), 0.1);
        d.display();
      } else {
        dots.remove(d);
        dots.add(0, new Dot(x, 0));
      }
    }
  }
}

class Entity {
  float x, y;
  Entity(float x, float y) {
    this.x=x;
    this.y=y;
  }
}

class Dot extends Entity {
  color col;
  boolean alive = true;
  color[] dotColors = new color[] {
    color(#1BE7FF), 
    color(#6EEB83), 
    color(#FF5714)
  };

  Dot(float x, float y) {
    super(x, y);
    int rnd = (int)random(dotColors.length);
    col = dotColors[rnd];
  }

  void display() {
    fill(red(col)-50, green(col)-50, blue(col)-50, 200);
    ellipse(x+2, y+2, dotRadius, dotRadius);

    fill(col);
    ellipse(x, y, dotRadius, dotRadius);
  }

  void removeSelf() {
    alive = false;
  }
}
void setup() {
  size(500, 500);
  float cx = width/2 - (5*(dotRadius+dotSpacing/2))/2;
  for (int i = 0; i < 5; i++) {
    columns.add(new Column(5, cx+i*(dotRadius+dotSpacing)));
  }
}

ArrayList<Dot> selectedDots = new ArrayList<Dot>();

boolean sdContainsDot(Dot d) {
  for (Dot sd : selectedDots) {
    if (sd.equals(d))
      return true;
  }
  return false;
}

boolean areAdjacent(Dot d1, Dot d2) {
  // truly awful way of doing this
  int d1_index_x = 0;
  int d2_index_x = 0;
  int d1_index_y = 0;
  int d2_index_y = 0;

  for (int b = 0; b < columns.size (); b++) {
    Column c = columns.get(b);
    for (int i = 0; i < c.dots.size (); i++) {
      Dot d = c.dots.get(i);
      if (d.equals(d1)) {
        d1_index_x = b;
        d1_index_y = i;
      }
    }
  }

  for (int b = 0; b < columns.size (); b++) {
    Column c = columns.get(b);    
    for (int i = 0; i < c.dots.size (); i++) {
      Dot d = c.dots.get(i);
      if (d.equals(d2)) {
        d2_index_x = b;
        d2_index_y = i;
      }
    }
  }
  return ((d1_index_x == d2_index_x && d1_index_y == d2_index_y-1) 
    || (d1_index_x == d2_index_x && d1_index_y == d2_index_y+1)
    || (d1_index_x == d2_index_x+1 && d1_index_y == d2_index_y)
    || (d1_index_x == d2_index_x-1 && d1_index_y == d2_index_y));
}
boolean hasLeftDot = true;
boolean isInDot = false;
void draw() {
  background(#DDDBCB);

  noStroke();

  for (Column c : columns) {
    c.display();
  }
  fill(0);
  currentTextSize = lerp(currentTextSize, 24, 0.2);
  textSize(currentTextSize);
  String txt = "Score: "+ score;
  text(txt, width/2 - textWidth(txt)/2, 50);
  strokeWeight(10);
  if (mousePressed) {
    for (Column c : columns) {
      for (Dot d : c.dots) {
        if (dist(mouseX, mouseY, d.x, d.y) < dotRadius/2) {
          if (!sdContainsDot(d)) {
            if (selectedDots.size() >= 1) {
              if (selectedDots.get(selectedDots.size()-1).col == d.col 
                && areAdjacent(selectedDots.get(selectedDots.size()-1), d)) {
                selectedDots.add(d);
                hasLeftDot = false;
              }
            } else { 
              selectedDots.add(d);
              hasLeftDot = false;
            }
          }
        }
      }
    }

    if (!hasLeftDot && dist(mouseX, mouseY, selectedDots.get(selectedDots.size()-1).x, selectedDots.get(selectedDots.size()-1).y) > dotRadius/2) {
      hasLeftDot = true;
    }


    if (selectedDots.size() >= 1) {
      color stcol = selectedDots.get(selectedDots.size()-1).col;
      stroke(red(stcol)-25, green(stcol)-25, blue(stcol)-25, 255);
      float dx = selectedDots.get(selectedDots.size()-1).x;
      float dy = selectedDots.get(selectedDots.size()-1).y;
      // todo; check angle between mouse and dot and quantize line to 90 deg intervals
      float angle = atan2(dy-mouseY, dx-mouseX);
      angle = degrees(angle);
      line(dx, dy, mouseX, mouseY);
//      if ((angle > -90 && angle < 45) || (angle > 135 && angle < 180) || (angle > -180 && angle < -135)) {
//        line(dx, dy, mouseX, dy);
//      } else if ((angle > 45 && angle < 135) || (angle < -45 && angle > -135)) {
//        line(dx, dy, dx, mouseY);
//      }
      if (selectedDots.size() == 1) {
        //        line(dx, dy, mouseX, mouseY);
      } else if (selectedDots.size() > 1) {
        for (int i = 1; i < selectedDots.size (); i++) {
          Dot d1 = selectedDots.get(i);
          Dot d0 = selectedDots.get(i-1);
          line(d0.x, d0.y, d1.x, d1.y);
        }
      }
    }
  }
}

void mouseReleased() {
  if (selectedDots.size()>=2) {
    for (Dot d : selectedDots) {
      d.removeSelf();
    }
    score += selectedDots.size() * 100;
    currentTextSize = 40;
  }
  selectedDots.clear();
}


