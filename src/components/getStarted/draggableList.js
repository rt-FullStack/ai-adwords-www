import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import InputFields from "./inputFields";

export default function DraggableList({ items, onDragEnd, type, handleChange, onChangeNumber, handleDescriptionInputChange }) {
  console.log("items", items);

  return (
    <DragDropContext onDragEnd={(result) => onDragEnd(result, type)}>
      <Droppable
        droppableId={type}
        type={type}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex flex-col">
            {items.map((input, index) => {
              return (
                <Draggable
                  key={input.id}
                  draggableId={input.id}
                  index={index}>
                  {(provided) => (
                    <div
                      className="store-container flex"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}>
                      <InputFields
                        key={input.id}
                        id={input.id}
                        index={index}
                        value={input.text}
                        number={input.number}
                        placeholder={`${type.charAt(0).toUpperCase()}${type.slice(1)} ${index + 1} ...`}
                        type={type}
                        onChangeNumber={onChangeNumber}
                        onChange={handleChange}
                        handleDescriptionInputChange={handleDescriptionInputChange}
                        /* ----------------------client------------------------------------ */
                        headlineNumber={input.headlineNumber}
                        onHeadlineNumberChange={(e) => handleChange(index, "headlineNumber")(e)}
                      />
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
